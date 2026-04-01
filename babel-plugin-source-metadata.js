const fs = require('fs');
const nodePath = require('path');

module.exports = function ({ types: t }) {
  return {
    name: 'source-metadata',
    visitor: {
      Program: {
        enter(path, state) {
          state._stylesheetDeclarations = {};
          state._pendingStyleEntries = [];
          state._styleMapEntries = {};
        },
        exit(path, state) {
          for (const pending of state._pendingStyleEntries) {
            const resolved = _resolveStyleEntry(t, pending, state._stylesheetDeclarations);
            if (resolved) {
              const key = pending.sourceKey;
              if (!state._styleMapEntries[key]) {
                state._styleMapEntries[key] = {
                  element: { file: pending.relativeFile, line: pending.elementLine },
                  styles: [],
                };
              }
              state._styleMapEntries[key].styles.push(resolved);
            }
          }

          if (Object.keys(state._styleMapEntries).length > 0) {
            _mergeStyleMap(state.cwd || process.cwd(), state._styleMapEntries);
          }
        },
      },

      CallExpression(path, state) {
        if (
          t.isMemberExpression(path.node.callee) &&
          t.isIdentifier(path.node.callee.object, { name: 'StyleSheet' }) &&
          t.isIdentifier(path.node.callee.property, { name: 'create' }) &&
          path.node.arguments.length === 1 &&
          t.isObjectExpression(path.node.arguments[0])
        ) {
          let varName = null;
          const parent = path.parentPath;
          if (parent.isVariableDeclarator() && t.isIdentifier(parent.node.id)) {
            varName = parent.node.id.name;
          }
          if (!varName) return;

          const declarations = {};
          for (const styleProp of path.node.arguments[0].properties) {
            if (!t.isObjectProperty(styleProp) || !t.isIdentifier(styleProp.key)) continue;
            const styleKey = styleProp.key.name;
            if (!t.isObjectExpression(styleProp.value)) continue;

            declarations[styleKey] = {
              defLine: styleProp.value.loc ? styleProp.value.loc.start.line : 0,
              properties: _extractObjectProperties(t, styleProp.value),
            };
          }

          state._stylesheetDeclarations[varName] = declarations;
        }
      },

      JSXOpeningElement(path, state) {
        const loc = path.node.loc;
        if (!loc) return;

        const elementName = path.node.name;
        if (t.isJSXIdentifier(elementName) && elementName.name === 'Fragment') return;
        if (
          t.isJSXMemberExpression(elementName) &&
          elementName.property.name === 'Fragment'
        )
          return;

        const filename = state.filename || '';
        const cwd = state.cwd || process.cwd();
        const relativeFile = filename.startsWith(cwd)
          ? filename.slice(cwd.length + 1)
          : filename;
        if (relativeFile.includes('node_modules')) return;

        let componentName = '';
        let current = path.parentPath;
        while (current) {
          if (current.isFunctionDeclaration() && current.node.id) {
            componentName = current.node.id.name;
            break;
          }
          if (current.isVariableDeclarator() && t.isIdentifier(current.node.id)) {
            componentName = current.node.id.name;
            break;
          }
          current = current.parentPath;
        }

        const line = loc.start.line;
        const sourceValue = componentName
          ? `${componentName}@${relativeFile}:${line}`
          : `${relativeFile}:${line}`;

        const sourceProp = t.objectProperty(
          t.identifier('source'),
          t.stringLiteral(sourceValue),
        );

        const existingDataSet = path.node.attributes.find(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name) &&
            attr.name.name === 'dataSet',
        );

        if (existingDataSet && t.isJSXExpressionContainer(existingDataSet.value)) {
          const expr = existingDataSet.value.expression;
          if (t.isObjectExpression(expr)) {
            const hasSource = expr.properties.some(
              (p) => t.isObjectProperty(p) && t.isIdentifier(p.key, { name: 'source' }),
            );
            if (!hasSource) {
              expr.properties.push(sourceProp);
            }
          }
        } else {
          path.node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('dataSet'),
              t.jsxExpressionContainer(t.objectExpression([sourceProp])),
            ),
          );
        }

        // --- NEW: Collect style prop info for style-map ---
        const styleAttr = path.node.attributes.find(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name) &&
            attr.name.name === 'style',
        );

        if (styleAttr && t.isJSXExpressionContainer(styleAttr.value)) {
          const styleExpr = styleAttr.value.expression;
          const entries = _collectStyleEntries(t, styleExpr, relativeFile);
          for (const entry of entries) {
            state._pendingStyleEntries.push({
              sourceKey: sourceValue,
              relativeFile,
              elementLine: line,
              ...entry,
            });
          }
        }
      },
    },
  };
};

function _extractObjectProperties(t, objExpr) {
  const props = {};
  for (const prop of objExpr.properties) {
    if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) continue;
    const name = prop.key.name;
    const valLoc = prop.value.loc;
    if (!valLoc) continue;

    let raw;
    if (t.isNumericLiteral(prop.value)) {
      raw = String(prop.value.value);
    } else if (t.isStringLiteral(prop.value)) {
      // Use Babel's preserved raw source text (includes original quotes).
      // Fallback to single-quoted string if extra.raw is unavailable.
      raw = (prop.value.extra && prop.value.extra.raw)
        ? prop.value.extra.raw
        : "'" + prop.value.value + "'";
    } else if (t.isUnaryExpression(prop.value) && prop.value.operator === '-' && t.isNumericLiteral(prop.value.argument)) {
      raw = String(-prop.value.argument.value);
    } else {
      raw = null;
    }

    if (raw !== null) {
      props[name] = {
        line: valLoc.start.line,
        col: valLoc.start.column,
        endCol: valLoc.end.column,
        raw,
      };
    }
  }
  return props;
}

function _collectStyleEntries(t, expr, relativeFile) {
  if (t.isObjectExpression(expr)) {
    return [{
      type: 'inline',
      file: relativeFile,
      properties: _extractObjectProperties(t, expr),
    }];
  }

  if (t.isMemberExpression(expr) && t.isIdentifier(expr.object) && t.isIdentifier(expr.property)) {
    return [{
      type: 'stylesheet-ref',
      varName: expr.object.name,
      key: expr.property.name,
    }];
  }

  if (t.isIdentifier(expr)) {
    return [{ type: 'unresolvable' }];
  }

  if (t.isArrayExpression(expr)) {
    const entries = [];
    for (const el of expr.elements) {
      if (el) {
        entries.push(..._collectStyleEntries(t, el, relativeFile));
      }
    }
    return entries;
  }

  if (t.isCallExpression(expr) || t.isConditionalExpression(expr) || t.isLogicalExpression(expr)) {
    return [{ type: 'unresolvable' }];
  }

  return [{ type: 'unresolvable' }];
}

function _resolveStyleEntry(t, pending, stylesheetDeclarations) {
  if (pending.type === 'inline') {
    if (Object.keys(pending.properties).length === 0) return null;
    return {
      origin: 'inline',
      file: pending.file,
      properties: pending.properties,
    };
  }

  if (pending.type === 'stylesheet-ref') {
    const decls = stylesheetDeclarations[pending.varName];
    if (!decls || !decls[pending.key]) {
      return { origin: 'dynamic', resolvable: false };
    }
    const resolved = decls[pending.key];
    return {
      origin: 'stylesheet',
      ref: `${pending.varName}.${pending.key}`,
      file: pending.relativeFile,
      defLine: resolved.defLine,
      properties: resolved.properties,
    };
  }

  if (pending.type === 'unresolvable') {
    return { origin: 'dynamic', resolvable: false };
  }

  return null;
}

function _mergeStyleMap(cwd, newEntries) {
  const mapPath = nodePath.join(cwd, 'style-map.json');
  let existing = { version: 1, generatedAt: 0, entries: {} };

  try {
    if (fs.existsSync(mapPath)) {
      existing = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    }
  } catch (e) {
    // Corrupted — start fresh
  }

  const files = new Set();
  for (const key of Object.keys(newEntries)) {
    const file = newEntries[key].element.file;
    files.add(file);
  }

  for (const key of Object.keys(existing.entries)) {
    const entryFile = existing.entries[key].element.file;
    if (files.has(entryFile)) {
      delete existing.entries[key];
    }
  }

  Object.assign(existing.entries, newEntries);
  existing.generatedAt = Date.now();

  fs.writeFileSync(mapPath, JSON.stringify(existing, null, 2), 'utf8');
}

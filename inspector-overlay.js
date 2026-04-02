/**
 * Inspector Overlay for Fastshot Preview
 *
 * Standalone vanilla JS module that runs inside the preview iframe.
 * Activated via postMessage from parent — highlights elements on hover,
 * sends back source location (from data-source attributes set by babel plugin)
 * when user clicks.
 *
 * Designed to be reusable: Quick Fix is the first consumer; future uses
 * include visual editor, drag & drop, inline editing, etc.
 */
(function () {
  'use strict';

  // Prevent double-init
  if (window.__fastshotInspector) return;

  var active = false;
  var currentTarget = null;
  var selectedTarget = null; // locked element after click — overlay stays until cleared
  var cursorInside = false;

  // --- Overlay elements ---
  // The overlay uses box-shadow to dim everything OUTSIDE its bounds,
  // creating a spotlight cutout over the hovered element.

  var overlay = document.createElement('div');
  overlay.id = '__fastshot-inspector-overlay';
  overlay.style.cssText =
    'position:fixed;z-index:99999;pointer-events:none;' +
    'background:rgba(89,58,255,0.5);border-radius:4px;' +
    'transition:top 0.05s ease-out,left 0.05s ease-out,width 0.05s ease-out,height 0.05s ease-out;' +
    'display:none;';

  var label = document.createElement('div');
  label.id = '__fastshot-inspector-label';
  label.style.cssText =
    'position:fixed;z-index:100000;pointer-events:none;' +
    'background:#1e1e2e;color:#e0e0e0;font:11px/1.3 "SF Mono",SFMono-Regular,Consolas,monospace;' +
    'padding:3px 8px;border-radius:4px;white-space:nowrap;display:none;' +
    'box-shadow:0 2px 8px rgba(0,0,0,0.3);max-width:400px;overflow:hidden;text-overflow:ellipsis;';

  // Margin overlay boxes (top, right, bottom, left)
  var marginColor = 'rgba(33, 214, 255, 0.5)';
  var marginOverlays = ['top', 'right', 'bottom', 'left'].map(function (side) {
    var el = document.createElement('div');
    el.id = '__fastshot-inspector-margin-' + side;
    el.style.cssText =
      'position:fixed;z-index:99998;pointer-events:none;display:none;' +
      'background:' + marginColor + ';';
    document.documentElement.appendChild(el);
    return el;
  });

  // Padding overlay boxes (top, right, bottom, left)
  var paddingColor = 'rgba(55, 200, 100, 0.5)';
  var paddingOverlays = ['top', 'right', 'bottom', 'left'].map(function (side) {
    var el = document.createElement('div');
    el.id = '__fastshot-inspector-padding-' + side;
    el.style.cssText =
      'position:fixed;z-index:99998;pointer-events:none;display:none;' +
      'background:' + paddingColor + ';';
    document.documentElement.appendChild(el);
    return el;
  });

  // Gap overlay boxes — dynamically created per gap slot
  var gapColor = 'rgba(255, 100, 180, 0.5)';
  var gapOverlays = [];

  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(label);

  // --- Helpers ---

  /** Walk up from el to find the nearest ancestor (or self) with data-source.
   *  If none found, walk back down from the clicked element to find the nearest
   *  descendant with data-source (handles library components like TabBar that
   *  don't forward dataSet). Returns the clicked element with source borrowed
   *  from the descendant so the highlight covers the actual clicked area. */
  function findSourceElement(el) {
    // 1. Walk up — standard path
    var node = el;
    while (node && node !== document.documentElement) {
      if (node.dataset && node.dataset.source) return node;
      node = node.parentElement;
    }

    // 2. Walk down — find nearest descendant with data-source
    var child = el.querySelector('[data-source]');
    if (child) {
      // Attach source to the original element so buildPayload can read it,
      // but highlight the original (larger) element the user actually hovered.
      el.dataset._borrowedSource = child.dataset.source;
      return el;
    }

    return null;
  }

  /** Hide highlight when cursor is not over a selectable element. */
  function showFullDim() {
    overlay.style.display = 'none';
    label.style.display = 'none';
    hideMarginOverlays();
    hidePaddingOverlays();
    hideGapOverlays();
  }

  /** Position overlay + label over a DOM element. */
  function hideMarginOverlays() {
    marginOverlays.forEach(function (el) { el.style.display = 'none'; });
  }

  function hidePaddingOverlays() {
    paddingOverlays.forEach(function (el) { el.style.display = 'none'; });
  }

  function showPaddingOverlays(el, rect) {
    var computed = window.getComputedStyle(el);
    var pt = parseFloat(computed.paddingTop) || 0;
    var pr = parseFloat(computed.paddingRight) || 0;
    var pb = parseFloat(computed.paddingBottom) || 0;
    var pl = parseFloat(computed.paddingLeft) || 0;

    if (pt === 0 && pr === 0 && pb === 0 && pl === 0) {
      hidePaddingOverlays();
      return;
    }

    // Padding is INSIDE the element rect
    // Top padding bar
    if (pt > 0) {
      paddingOverlays[0].style.cssText =
        'position:fixed;z-index:100001;pointer-events:none;display:block;background:' + paddingColor + ';' +
        'top:' + rect.top + 'px;left:' + rect.left + 'px;width:' + rect.width + 'px;height:' + pt + 'px;';
    } else { paddingOverlays[0].style.display = 'none'; }

    // Right padding bar
    if (pr > 0) {
      paddingOverlays[1].style.cssText =
        'position:fixed;z-index:100001;pointer-events:none;display:block;background:' + paddingColor + ';' +
        'top:' + (rect.top + pt) + 'px;left:' + (rect.right - pr) + 'px;width:' + pr + 'px;height:' + (rect.height - pt - pb) + 'px;';
    } else { paddingOverlays[1].style.display = 'none'; }

    // Bottom padding bar
    if (pb > 0) {
      paddingOverlays[2].style.cssText =
        'position:fixed;z-index:100001;pointer-events:none;display:block;background:' + paddingColor + ';' +
        'top:' + (rect.bottom - pb) + 'px;left:' + rect.left + 'px;width:' + rect.width + 'px;height:' + pb + 'px;';
    } else { paddingOverlays[2].style.display = 'none'; }

    // Left padding bar
    if (pl > 0) {
      paddingOverlays[3].style.cssText =
        'position:fixed;z-index:100001;pointer-events:none;display:block;background:' + paddingColor + ';' +
        'top:' + (rect.top + pt) + 'px;left:' + rect.left + 'px;width:' + pl + 'px;height:' + (rect.height - pt - pb) + 'px;';
    } else { paddingOverlays[3].style.display = 'none'; }
  }

  function hideGapOverlays() {
    gapOverlays.forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    gapOverlays = [];
  }

  function showGapOverlays(el) {
    hideGapOverlays();
    var computed = window.getComputedStyle(el);
    var display = computed.display;
    if (display !== 'flex' && display !== 'inline-flex') return;

    var gap = parseFloat(computed.gap || computed.rowGap) || 0;
    var columnGap = parseFloat(computed.columnGap) || gap;
    var rowGap = parseFloat(computed.rowGap) || gap;
    if (columnGap === 0 && rowGap === 0) return;

    var direction = computed.flexDirection || 'row';
    var children = [];
    for (var i = 0; i < el.children.length; i++) {
      var child = el.children[i];
      var childComputed = window.getComputedStyle(child);
      if (childComputed.display === 'none' || childComputed.position === 'absolute' || childComputed.position === 'fixed') continue;
      children.push(child);
    }

    for (var j = 0; j < children.length - 1; j++) {
      var r1 = children[j].getBoundingClientRect();
      var r2 = children[j + 1].getBoundingClientRect();
      var gapEl = document.createElement('div');
      gapEl.className = '__fastshot-inspector-gap';

      if (direction === 'row' || direction === 'row-reverse') {
        // Horizontal gap between children
        var gLeft = Math.min(r1.right, r2.right);
        var gRight = Math.max(r1.left, r2.left);
        if (gRight <= gLeft) continue;
        var gTop = Math.min(r1.top, r2.top);
        var gBottom = Math.max(r1.bottom, r2.bottom);
        gapEl.style.cssText =
          'position:fixed;z-index:100001;pointer-events:none;display:block;background:' + gapColor + ';' +
          'top:' + gTop + 'px;left:' + gLeft + 'px;width:' + (gRight - gLeft) + 'px;height:' + (gBottom - gTop) + 'px;';
      } else {
        // Vertical gap between children
        var gTopV = Math.min(r1.bottom, r2.bottom);
        var gBottomV = Math.max(r1.top, r2.top);
        if (gBottomV <= gTopV) continue;
        var gLeftV = Math.min(r1.left, r2.left);
        var gRightV = Math.max(r1.right, r2.right);
        gapEl.style.cssText =
          'position:fixed;z-index:100001;pointer-events:none;display:block;background:' + gapColor + ';' +
          'top:' + gTopV + 'px;left:' + gLeftV + 'px;width:' + (gRightV - gLeftV) + 'px;height:' + (gBottomV - gTopV) + 'px;';
      }

      document.documentElement.appendChild(gapEl);
      gapOverlays.push(gapEl);
    }
  }

  function showMarginOverlays(el, rect) {
    var computed = window.getComputedStyle(el);
    var mt = parseFloat(computed.marginTop) || 0;
    var mr = parseFloat(computed.marginRight) || 0;
    var mb = parseFloat(computed.marginBottom) || 0;
    var ml = parseFloat(computed.marginLeft) || 0;

    if (mt === 0 && mr === 0 && mb === 0 && ml === 0) {
      hideMarginOverlays();
      return;
    }

    // Top margin bar
    if (mt > 0) {
      marginOverlays[0].style.cssText =
        'position:fixed;z-index:99998;pointer-events:none;display:block;background:' + marginColor + ';' +
        'top:' + (rect.top - mt) + 'px;left:' + rect.left + 'px;width:' + rect.width + 'px;height:' + mt + 'px;';
    } else { marginOverlays[0].style.display = 'none'; }

    // Right margin bar
    if (mr > 0) {
      marginOverlays[1].style.cssText =
        'position:fixed;z-index:99998;pointer-events:none;display:block;background:' + marginColor + ';' +
        'top:' + (rect.top - mt) + 'px;left:' + rect.right + 'px;width:' + mr + 'px;height:' + (rect.height + mt + mb) + 'px;';
    } else { marginOverlays[1].style.display = 'none'; }

    // Bottom margin bar
    if (mb > 0) {
      marginOverlays[2].style.cssText =
        'position:fixed;z-index:99998;pointer-events:none;display:block;background:' + marginColor + ';' +
        'top:' + rect.bottom + 'px;left:' + rect.left + 'px;width:' + rect.width + 'px;height:' + mb + 'px;';
    } else { marginOverlays[2].style.display = 'none'; }

    // Left margin bar
    if (ml > 0) {
      marginOverlays[3].style.cssText =
        'position:fixed;z-index:99998;pointer-events:none;display:block;background:' + marginColor + ';' +
        'top:' + (rect.top - mt) + 'px;left:' + (rect.left - ml) + 'px;width:' + ml + 'px;height:' + (rect.height + mt + mb) + 'px;';
    } else { marginOverlays[3].style.display = 'none'; }
  }

  function positionOverlay(el) {
    var rect = el.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';

    showMarginOverlays(el, rect);
    showPaddingOverlays(el, rect);
    showGapOverlays(el);

    // Label above element, fall below if no room
    var labelTop = rect.top - 24;
    if (labelTop < 4) labelTop = rect.bottom + 4;
    label.style.top = labelTop + 'px';

    // Position label: align to left edge, but flip to right if it overflows viewport
    var vw = document.documentElement.clientWidth;
    label.style.left = '';
    label.style.right = '';
    var labelLeft = Math.max(4, rect.left);
    // Temporarily show to measure width
    label.style.display = 'block';
    label.style.left = labelLeft + 'px';
    var labelRect = label.getBoundingClientRect();
    if (labelRect.right > vw - 4) {
      // Flip: anchor to right edge of element instead
      label.style.left = '';
      label.style.right = Math.max(4, vw - rect.right) + 'px';
    }
  }

  function hideOverlay() {
    overlay.style.display = 'none';
    label.style.display = 'none';
    hideMarginOverlays();
    hidePaddingOverlays();
    hideGapOverlays();
    currentTarget = null;
    selectedTarget = null;
  }

  /**
   * Walk up the DOM from `el` to find which ancestor actually sets a CSS property.
   * Returns the data-source of the owning element, or null if the element itself owns it.
   *
   * Logic: compare getComputedStyle(current)[prop] with getComputedStyle(parent)[prop].
   * When the values differ, `current` is the element that sets the property.
   * Then walk up from `current` to find its nearest data-source attribute.
   */
  function findPropertyOwner(el, property) {
    var current = el;
    while (current && current.parentElement && current !== document.documentElement) {
      var parent = current.parentElement;
      var currentVal, parentVal;
      try {
        currentVal = window.getComputedStyle(current)[property];
        parentVal = window.getComputedStyle(parent)[property];
      } catch (e) {
        break;
      }

      if (currentVal !== parentVal) {
        // `current` sets or overrides this property — find its data-source
        var sourceEl = current;
        while (sourceEl && !(sourceEl.dataset && (sourceEl.dataset.source || sourceEl.dataset._borrowedSource))) {
          sourceEl = sourceEl.parentElement;
        }
        if (sourceEl) {
          return sourceEl.dataset.source || sourceEl.dataset._borrowedSource;
        }
        return null;
      }
      current = parent;
    }
    // Walked all the way up — property comes from root/default styles
    return null;
  }

  function buildPayload(el) {
    var source = el.dataset.source || el.dataset._borrowedSource || '';
    var text = (el.textContent || '').trim().substring(0, 120);
    var rect = el.getBoundingClientRect();
    var computed = window.getComputedStyle(el);
    // Check for img: either the element itself or a descendant <img>
    var imgEl = el.tagName === 'IMG' ? el : el.querySelector('img');
    var tagName = imgEl ? 'img' : el.tagName.toLowerCase();

    // For each computed property, find which ancestor actually defines it.
    // If the owner is different from the clicked element, record its data-source.
    var styleOwners = {};
    var propsToCheck = ['color', 'fontSize', 'fontFamily', 'margin',
      'backgroundColor', 'padding', 'gap', 'flexDirection',
      'justifyContent', 'alignItems'];
    for (var i = 0; i < propsToCheck.length; i++) {
      var prop = propsToCheck[i];
      var owner = findPropertyOwner(el, prop);
      if (owner && owner !== source) {
        styleOwners[prop] = owner;
      }
    }

    return {
      source: source,
      text: text,
      tagName: tagName,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      computedSize: { width: computed.width, height: computed.height },
      imageSrc: imgEl ? (imgEl.src || null) : null,
      styleOwners: Object.keys(styleOwners).length > 0 ? styleOwners : undefined,
      computedStyles: {
        color: computed.color,
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
        margin: computed.margin,
        backgroundColor: computed.backgroundColor,
        padding: computed.padding,
        display: computed.display,
        gap: computed.gap,
        flexDirection: computed.flexDirection,
      },
    };
  }

  function sendToParent(action, payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: 'fastshot-inspector', action: action, payload: payload || null },
          '*'
        );
      }
    } catch (e) {
      // silently ignore
    }
  }

  // --- Event handlers (capture phase to intercept before app) ---

  function onMouseMove(e) {
    if (!active) return;
    cursorInside = true;
    // If an element is selected (clicked), keep overlay locked on it
    if (selectedTarget) return;
    var el = findSourceElement(e.target);
    if (el && el !== currentTarget) {
      currentTarget = el;
      resetOverlayToHoverStyle();
      var source = el.dataset.source || el.dataset._borrowedSource || '';
      label.textContent = source;
      positionOverlay(el);
      sendToParent('element-hover', buildPayload(el));
    } else if (!el) {
      currentTarget = null;
      showFullDim();
    }
  }

  function onMouseLeave() {
    if (!active) return;
    cursorInside = false;
    // Don't hide overlay if an element is selected
    if (selectedTarget) return;
    hideOverlay();
  }

  function onClick(e) {
    if (!active) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    var el = findSourceElement(e.target);
    if (el) {
      selectedTarget = el;
      currentTarget = el;
      var payload = buildPayload(el);
      // Switch overlay to selected state: dashed border, transparent background
      overlay.style.background = 'transparent';
      overlay.style.border = '2px dashed #593AFF';
      positionOverlay(el);
      sendToParent('element-selected', payload);
    }
  }

  /** Reset overlay to hover style (called when hovering a new element). */
  function resetOverlayToHoverStyle() {
    overlay.style.background = 'rgba(89,58,255,0.5)';
    overlay.style.border = 'none';
  }

  function onKeyDown(e) {
    if (!active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      deactivate();
      sendToParent('deactivated');
    }
  }

  // --- Activate / Deactivate ---

  function activate() {
    if (active) return;
    active = true;
    cursorInside = false;
    // Don't dim until cursor enters the preview
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    document.body.style.cursor = 'crosshair';
  }

  function deactivate() {
    if (!active) return;
    active = false;
    cursorInside = false;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.documentElement.removeEventListener('mouseleave', onMouseLeave);
    document.body.style.cursor = '';
    hideOverlay();
  }

  // --- Listen for commands from parent ---

  window.addEventListener('message', function (e) {
    var data = e.data;
    if (!data || data.type !== 'fastshot-inspector') return;

    switch (data.action) {
      case 'activate':
        activate();
        break;
      case 'deactivate':
        deactivate();
        sendToParent('deactivated');
        break;
      case 'clear-selection':
        selectedTarget = null;
        resetOverlayToHoverStyle();
        break;
    }
  });

  // --- Public API ---

  window.__fastshotInspector = {
    activate: activate,
    deactivate: deactivate,
    get isActive() {
      return active;
    },
  };
})();

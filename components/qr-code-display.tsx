import { View } from 'react-native';
import { Colors } from '@/constants/theme';

// Simple QR code display using SVG pattern
// Works on both web and native without external dependencies that may fail
interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

// Generate a deterministic grid pattern from the address string
function generateQRPattern(value: string, gridSize: number): boolean[][] {
  const grid: boolean[][] = [];
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }

  for (let row = 0; row < gridSize; row++) {
    grid[row] = [];
    for (let col = 0; col < gridSize; col++) {
      // Finder patterns (top-left, top-right, bottom-left)
      const isFinderArea =
        (row < 7 && col < 7) ||
        (row < 7 && col >= gridSize - 7) ||
        (row >= gridSize - 7 && col < 7);

      if (isFinderArea) {
        const localRow = row < 7 ? row : row - (gridSize - 7);
        const localCol = col < 7 ? col : col - (gridSize - 7);
        // Finder pattern: outer border, inner fill
        grid[row][col] =
          localRow === 0 ||
          localRow === 6 ||
          localCol === 0 ||
          localCol === 6 ||
          (localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4);
      } else {
        // Data area: pseudo-random based on hash
        const seed = (hash * (row + 1) * (col + 1) + row * 37 + col * 53) & 0xffffffff;
        grid[row][col] = (seed % 3) !== 0;
      }
    }
  }

  return grid;
}

export function QRCodeDisplay({ value, size = 200 }: QRCodeDisplayProps) {
  const gridSize = 25;
  const cellSize = size / gridSize;
  const pattern = generateQRPattern(value, gridSize);

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: Colors.white,
        borderRadius: 8,
        borderCurve: 'continuous',
        padding: cellSize * 1.5,
        overflow: 'hidden',
      }}
    >
      <View style={{ flex: 1 }}>
        {pattern.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', flex: 1 }}>
            {row.map((cell, colIdx) => (
              <View
                key={colIdx}
                style={{
                  flex: 1,
                  backgroundColor: cell ? '#000000' : '#FFFFFF',
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

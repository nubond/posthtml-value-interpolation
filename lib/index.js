export default (options = {}) => tree => {
  options = options || {};
  
  const RAW_TEXT_TAGS = new Set(['script', 'style']);
  
  const treeWalker = nodes => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (Array.isArray(node)) {
        treeWalker(node);
      } else if (typeof(node) === 'object') {
        if ((node != null) && 
            (typeof(node.tag) === 'string') && !RAW_TEXT_TAGS.has(node.tag.toLowerCase()) && 
            Array.isArray(node.content)) {
          treeWalker(node.content);
        }
      } else if (typeof(node) === 'string') {
        if ((node.length > 0) && !node.startsWith('<!--')) {
          const interpolationIndexes = [];

          let previousChar = '';
          let currentChar = '';

          let interpolationStartIndex = -1;
          let unclosedBrackets = 0;

          for (let j = 0; j < node.length; j++) {
            previousChar = currentChar;
            currentChar = node[j];

            if (currentChar == '{') {
              unclosedBrackets++;

              if (previousChar == '{') {
                interpolationStartIndex = j - 1;
              }
            } else if (currentChar == '}') {
              unclosedBrackets--;

              if (previousChar == '}') {
                if ((unclosedBrackets == 0) && (interpolationStartIndex >= 0)) {
                  interpolationIndexes.push({start: interpolationStartIndex, end: j});
                  interpolationStartIndex = -1;
                }
              }
            }
          }

          if (unclosedBrackets == 0) {
            if (interpolationIndexes.length > 0) {
              let result = '';
              let index = 0;
              let startIndex = 0;

              do
              {
                const pair = interpolationIndexes[index++];
                result += node.substring(startIndex, pair.start);
                result += `<span nb-value="${node.substring(pair.start + 2, pair.end - 1).replaceAll('"', '\'')}"></span>`;
                startIndex = pair.end + 1;
              } while (index < interpolationIndexes.length);

              if (startIndex < node.length) {
                result += node.substring(startIndex, node.length);
              }

              nodes[i] = result;
            }
          } else {
            console.error(`[posthtml-value-interpolation] ${node} contains invalid interpolation`);
          }
        }
      }
    }

    return nodes;
  };

  return treeWalker(tree);
}

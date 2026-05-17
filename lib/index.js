export default (options = {}) => tree => {
  options = options || {};

  return tree.walk(node => {
    if ((typeof(node) === 'string') && (node.length > 0)) {
      const getStartIndex = (rawExpression, endIndex) => {
        let startIndex = -1;
        let nextStartIndex = startIndex;

        do
        {
            startIndex = nextStartIndex;
            nextStartIndex = rawExpression.indexOf('{{', startIndex + 1);
        } while((nextStartIndex >= 0) && (nextStartIndex > startIndex) && (nextStartIndex < endIndex));

        return startIndex;
      };
      
      let rawExpression = node;
      let endIndex = rawExpression.indexOf('}}');
      let startIndex = getStartIndex(rawExpression, endIndex);

      if ((startIndex >= 0) && (startIndex < endIndex)) {
        let result = '';

        do 
        {
          if (startIndex > 0) {
            result += rawExpression.substring(0, startIndex);
          }

          result += `<span nb-value="${rawExpression.substring(startIndex + 2, endIndex)}"></span>`;

          rawExpression = rawExpression.substring(endIndex + 2);

          endIndex = rawExpression.indexOf('}}');
          startIndex = getStartIndex(rawExpression, endIndex);
        } while(startIndex >= 0);

        result += rawExpression;

        return result;
      } else {
        return node;
      }
    } else {
      return node;
    }
  });
}

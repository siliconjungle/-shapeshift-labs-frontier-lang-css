function shorthandGroupForProperty(property) {
  if (ShorthandGroups.has(property)) return property;
  for (const [group, longhands] of ShorthandGroups) if (longhands.includes(property)) return group;
  return undefined;
}

const ShorthandGroups = new Map([
  ['background', ['background-attachment', 'background-clip', 'background-color', 'background-image', 'background-origin', 'background-position', 'background-repeat', 'background-size']],
  ['border', ['border-color', 'border-style', 'border-width', 'border-top', 'border-right', 'border-bottom', 'border-left']],
  ['font', ['font-family', 'font-size', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'line-height']],
  ['list-style', ['list-style-image', 'list-style-position', 'list-style-type']],
  ['margin', ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']],
  ['padding', ['padding-top', 'padding-right', 'padding-bottom', 'padding-left']]
]);

export { shorthandGroupForProperty };

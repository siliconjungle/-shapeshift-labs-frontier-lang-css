function shorthandGroupForProperty(property) {
  const normalized = normalizeProperty(property);
  if (!normalized) return undefined;
  if (ShorthandExpansionKeys.has(normalized)) return normalized;
  for (const [group, keys] of ShorthandExpansionKeys) if (keys.has(normalized)) return group;
  return undefined;
}

function declarationsOverlapByCssProperty(leftProperty, rightProperty) {
  const left = normalizeProperty(leftProperty);
  const right = normalizeProperty(rightProperty);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.startsWith('--') || right.startsWith('--')) return false;
  const leftKeys = affectedPropertyKeys(left);
  const rightKeys = affectedPropertyKeys(right);
  if (leftKeys.has(AllStandardProperties)) return !allPropertyExcluded(right);
  if (rightKeys.has(AllStandardProperties)) return !allPropertyExcluded(left);
  for (const key of leftKeys) if (rightKeys.has(key)) return true;
  return false;
}

function affectedPropertyKeys(property) {
  return ShorthandExpansionKeys.get(property) ?? new Set([property]);
}

function normalizeProperty(property) {
  return String(property ?? '').trim().toLowerCase();
}

function allPropertyExcluded(property) {
  return property.startsWith('--') || property === 'direction' || property === 'unicode-bidi';
}

const AllStandardProperties = '*';

const ShorthandExpansionKeys = new Map(Object.entries({
  all: [AllStandardProperties],
  animation: ['animation-composition', 'animation-delay', 'animation-direction', 'animation-duration', 'animation-fill-mode', 'animation-iteration-count', 'animation-name', 'animation-play-state', 'animation-range-end', 'animation-range-start', 'animation-timeline', 'animation-timing-function'],
  background: ['background-attachment', 'background-blend-mode', 'background-clip', 'background-color', 'background-image', 'background-origin', 'background-position', 'background-repeat', 'background-size'],
  border: [
    ...edgeKeys('border', ['width', 'style', 'color']),
    'border-width',
    'border-style',
    'border-color',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left'
  ],
  'border-block': [...logicalEdgeKeys('border-block', ['width', 'style', 'color']), 'border-block-width', 'border-block-style', 'border-block-color', 'border-block-start', 'border-block-end'],
  'border-block-color': logicalEdgeKeys('border-block', ['color']),
  'border-block-end': propertyTuple('border-block-end', ['width', 'style', 'color']),
  'border-block-end-color': ['border-block-end-color'],
  'border-block-end-style': ['border-block-end-style'],
  'border-block-end-width': ['border-block-end-width'],
  'border-block-start': propertyTuple('border-block-start', ['width', 'style', 'color']),
  'border-block-start-color': ['border-block-start-color'],
  'border-block-start-style': ['border-block-start-style'],
  'border-block-start-width': ['border-block-start-width'],
  'border-block-style': logicalEdgeKeys('border-block', ['style']),
  'border-block-width': logicalEdgeKeys('border-block', ['width']),
  'border-bottom': propertyTuple('border-bottom', ['width', 'style', 'color']),
  'border-bottom-color': ['border-bottom-color'],
  'border-bottom-left-radius': ['border-bottom-left-radius'],
  'border-bottom-right-radius': ['border-bottom-right-radius'],
  'border-bottom-style': ['border-bottom-style'],
  'border-bottom-width': ['border-bottom-width'],
  'border-color': edgeKeys('border', ['color']),
  'border-image': ['border-image-source', 'border-image-slice', 'border-image-width', 'border-image-outset', 'border-image-repeat'],
  'border-inline': [...logicalEdgeKeys('border-inline', ['width', 'style', 'color']), 'border-inline-width', 'border-inline-style', 'border-inline-color', 'border-inline-start', 'border-inline-end'],
  'border-inline-color': logicalEdgeKeys('border-inline', ['color']),
  'border-inline-end': propertyTuple('border-inline-end', ['width', 'style', 'color']),
  'border-inline-end-color': ['border-inline-end-color'],
  'border-inline-end-style': ['border-inline-end-style'],
  'border-inline-end-width': ['border-inline-end-width'],
  'border-inline-start': propertyTuple('border-inline-start', ['width', 'style', 'color']),
  'border-inline-start-color': ['border-inline-start-color'],
  'border-inline-start-style': ['border-inline-start-style'],
  'border-inline-start-width': ['border-inline-start-width'],
  'border-inline-style': logicalEdgeKeys('border-inline', ['style']),
  'border-inline-width': logicalEdgeKeys('border-inline', ['width']),
  'border-left': propertyTuple('border-left', ['width', 'style', 'color']),
  'border-left-color': ['border-left-color'],
  'border-left-style': ['border-left-style'],
  'border-left-width': ['border-left-width'],
  'border-radius': ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'],
  'border-right': propertyTuple('border-right', ['width', 'style', 'color']),
  'border-right-color': ['border-right-color'],
  'border-right-style': ['border-right-style'],
  'border-right-width': ['border-right-width'],
  'border-style': edgeKeys('border', ['style']),
  'border-top': propertyTuple('border-top', ['width', 'style', 'color']),
  'border-top-color': ['border-top-color'],
  'border-top-left-radius': ['border-top-left-radius'],
  'border-top-right-radius': ['border-top-right-radius'],
  'border-top-style': ['border-top-style'],
  'border-top-width': ['border-top-width'],
  'border-width': edgeKeys('border', ['width']),
  columns: ['column-width', 'column-count'],
  flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
  font: ['font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'line-height'],
  gap: ['row-gap', 'column-gap'],
  grid: ['grid-template-rows', 'grid-template-columns', 'grid-template-areas', 'grid-auto-rows', 'grid-auto-columns', 'grid-auto-flow'],
  'grid-area': ['grid-row-start', 'grid-column-start', 'grid-row-end', 'grid-column-end'],
  'grid-column': ['grid-column-start', 'grid-column-end'],
  'grid-row': ['grid-row-start', 'grid-row-end'],
  inset: ['top', 'right', 'bottom', 'left'],
  'inset-block': ['inset-block-start', 'inset-block-end'],
  'inset-inline': ['inset-inline-start', 'inset-inline-end'],
  'list-style': ['list-style-image', 'list-style-position', 'list-style-type'],
  margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  'margin-block': ['margin-block-start', 'margin-block-end'],
  'margin-inline': ['margin-inline-start', 'margin-inline-end'],
  offset: ['offset-anchor', 'offset-distance', 'offset-path', 'offset-position', 'offset-rotate'],
  outline: ['outline-color', 'outline-style', 'outline-width'],
  overflow: ['overflow-x', 'overflow-y'],
  'overscroll-behavior': ['overscroll-behavior-x', 'overscroll-behavior-y'],
  padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  'padding-block': ['padding-block-start', 'padding-block-end'],
  'padding-inline': ['padding-inline-start', 'padding-inline-end'],
  'place-content': ['align-content', 'justify-content'],
  'place-items': ['align-items', 'justify-items'],
  'place-self': ['align-self', 'justify-self'],
  'scroll-margin': ['scroll-margin-top', 'scroll-margin-right', 'scroll-margin-bottom', 'scroll-margin-left'],
  'scroll-margin-block': ['scroll-margin-block-start', 'scroll-margin-block-end'],
  'scroll-margin-inline': ['scroll-margin-inline-start', 'scroll-margin-inline-end'],
  'scroll-padding': ['scroll-padding-top', 'scroll-padding-right', 'scroll-padding-bottom', 'scroll-padding-left'],
  'scroll-padding-block': ['scroll-padding-block-start', 'scroll-padding-block-end'],
  'scroll-padding-inline': ['scroll-padding-inline-start', 'scroll-padding-inline-end'],
  'text-decoration': ['text-decoration-line', 'text-decoration-color', 'text-decoration-style', 'text-decoration-thickness'],
  transition: ['transition-behavior', 'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function']
}).map(([property, keys]) => [property, new Set(keys)]));

function edgeKeys(prefix, attributes) {
  return ['top', 'right', 'bottom', 'left'].flatMap((edge) => attributes.map((attribute) => `${prefix}-${edge}-${attribute}`));
}

function logicalEdgeKeys(prefix, attributes) {
  return ['start', 'end'].flatMap((edge) => attributes.map((attribute) => `${prefix}-${edge}-${attribute}`));
}

function propertyTuple(prefix, attributes) {
  return attributes.map((attribute) => `${prefix}-${attribute}`);
}

export { declarationsOverlapByCssProperty, shorthandGroupForProperty };

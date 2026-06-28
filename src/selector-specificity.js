const SelectorListPseudos = new Set(['is', 'not', 'has']);
const NthSelectorPseudos = new Set(['nth-child', 'nth-last-child']);

function splitSelectorList(input) {
  return splitTopLevel(input, ',').map((part) => part.trim()).filter(Boolean);
}

function selectorSpecificityRecord(selector) {
  const state = { exact: true, functionalPseudos: new Set(), pseudoElements: new Set() };
  const specificity = selectorSpecificity(selector, state);
  return compactRecord({
    selector,
    specificity,
    algorithm: 'selectors-level-4',
    parserBackedSelectorSpecificity: true,
    selectorsLevel4Specificity: true,
    specificityExact: state.exact,
    functionalPseudoSpecificity: state.functionalPseudos.size > 0 || undefined,
    functionalPseudos: state.functionalPseudos.size ? [...state.functionalPseudos].sort() : undefined,
    pseudoElements: state.pseudoElements.size ? [...state.pseudoElements].sort() : undefined
  });
}

function selectorSpecificity(selector, state) {
  const total = [0, 0, 0];
  let index = 0;
  while (index < selector.length) {
    const char = selector[index];
    if (isSpace(char) || isCombinator(char) || char === '*') { index += 1; continue; }
    if (char === '"' || char === "'") { index = skipString(selector, index); continue; }
    if (selector.startsWith('/*', index)) { index = skipComment(selector, index); continue; }
    if (char === '&') { state.exact = false; index += 1; continue; }
    if (char === '[') { add(total, [0, 1, 0]); index = skipBalanced(selector, index, '[', ']'); continue; }
    if (char === '#') {
      const ident = readIdent(selector, index + 1);
      if (ident.end > index + 1) add(total, [1, 0, 0]);
      index = Math.max(ident.end, index + 1);
      continue;
    }
    if (char === '.') {
      const ident = readIdent(selector, index + 1);
      if (ident.end > index + 1) add(total, [0, 1, 0]);
      index = Math.max(ident.end, index + 1);
      continue;
    }
    if (char === ':') {
      index = readPseudo(selector, index, state, total);
      continue;
    }
    if (char === '|') { index += 1; continue; }
    if (isIdentStart(char) || char === '\\') {
      const ident = readIdent(selector, index);
      if (ident.end > index && selector[ident.end] !== '|' && isTypeSelectorPosition(selector, index)) add(total, [0, 0, 1]);
      index = Math.max(ident.end, index + 1);
      continue;
    }
    index += 1;
  }
  return total;
}

function readPseudo(selector, index, state, total) {
  const pseudoElement = selector[index + 1] === ':';
  const nameStart = index + (pseudoElement ? 2 : 1);
  const ident = readIdent(selector, nameStart);
  const name = ident.value.toLowerCase();
  const hasFunction = selector[ident.end] === '(';
  if (pseudoElement) {
    add(total, [0, 0, 1]);
    if (name) state.pseudoElements.add(name);
    if (hasFunction && name === 'slotted') add(total, maxSelectorListSpecificity(balancedContent(selector, ident.end), state));
    else if (hasFunction && name !== 'part') state.exact = false;
    return hasFunction ? skipBalanced(selector, ident.end, '(', ')') : Math.max(ident.end, index + 2);
  }
  if (!hasFunction) {
    if (name) add(total, [0, 1, 0]);
    return Math.max(ident.end, index + 1);
  }
  const content = balancedContent(selector, ident.end);
  if (name === 'where') {
    state.functionalPseudos.add(name);
    return skipBalanced(selector, ident.end, '(', ')');
  }
  if (SelectorListPseudos.has(name)) {
    state.functionalPseudos.add(name);
    add(total, maxSelectorListSpecificity(content, state));
    return skipBalanced(selector, ident.end, '(', ')');
  }
  if (NthSelectorPseudos.has(name)) {
    state.functionalPseudos.add(name);
    add(total, [0, 1, 0]);
    const ofSelectors = nthOfSelectorList(content);
    if (ofSelectors) add(total, maxSelectorListSpecificity(ofSelectors, state));
    return skipBalanced(selector, ident.end, '(', ')');
  }
  if (name === 'local' || name === 'global') state.exact = false;
  add(total, [0, 1, 0]);
  return skipBalanced(selector, ident.end, '(', ')');
}

function maxSelectorListSpecificity(input, state) {
  return splitSelectorList(input).reduce((max, selector) => {
    const next = selectorSpecificity(selector, state);
    return compareSpecificity(next, max) > 0 ? next : max;
  }, [0, 0, 0]);
}

function nthOfSelectorList(input) {
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (char === '"' || char === "'") { index = skipString(input, index); continue; }
    if (input.startsWith('/*', index)) { index = skipComment(input, index); continue; }
    if (char === '[') { index = skipBalanced(input, index, '[', ']'); continue; }
    if (char === '(') { index = skipBalanced(input, index, '(', ')'); continue; }
    if (isIdentStart(char)) {
      const ident = readIdent(input, index);
      if (ident.value.toLowerCase() === 'of' && boundary(input[index - 1]) && boundary(input[ident.end])) return input.slice(ident.end).trim();
      index = ident.end;
      continue;
    }
    index += 1;
  }
  return undefined;
}

function splitTopLevel(input, delimiter) {
  const parts = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"' || char === "'") { index = skipString(input, index) - 1; continue; }
    if (input.startsWith('/*', index)) { index = skipComment(input, index) - 1; continue; }
    if (char === '[' || char === '(') depth += 1;
    else if ((char === ']' || char === ')') && depth > 0) depth -= 1;
    else if (char === delimiter && depth === 0) {
      parts.push(input.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(input.slice(start));
  return parts;
}

function balancedContent(input, openIndex) {
  const end = skipBalanced(input, openIndex, '(', ')');
  return input.slice(openIndex + 1, Math.max(openIndex + 1, end - 1));
}

function skipBalanced(input, index, open, close) {
  let depth = 0;
  for (let cursor = index; cursor < input.length; cursor += 1) {
    if (input[cursor] === '"' || input[cursor] === "'") { cursor = skipString(input, cursor) - 1; continue; }
    if (input.startsWith('/*', cursor)) { cursor = skipComment(input, cursor) - 1; continue; }
    if (input[cursor] === open) depth += 1;
    else if (input[cursor] === close) {
      depth -= 1;
      if (depth === 0) return cursor + 1;
    }
  }
  return input.length;
}

function skipString(input, index) {
  const quote = input[index];
  for (let cursor = index + 1; cursor < input.length; cursor += 1) {
    if (input[cursor] === '\\') { cursor += 1; continue; }
    if (input[cursor] === quote) return cursor + 1;
  }
  return input.length;
}

function skipComment(input, index) {
  const end = input.indexOf('*/', index + 2);
  return end === -1 ? input.length : end + 2;
}

function readIdent(input, index) {
  let cursor = index;
  while (cursor < input.length) {
    const char = input[cursor];
    if (isIdentChar(char)) { cursor += 1; continue; }
    if (char === '\\' && cursor + 1 < input.length) { cursor += 2; continue; }
    break;
  }
  return { value: input.slice(index, cursor).replace(/\\/g, ''), end: cursor };
}

function isTypeSelectorPosition(input, index) {
  let cursor = index - 1;
  while (cursor >= 0 && isSpace(input[cursor])) cursor -= 1;
  return cursor < 0 || isCombinator(input[cursor]) || input[cursor] === ',' || input[cursor] === '(' || input[cursor] === '|';
}

function compareSpecificity(left, right) {
  for (let index = 0; index < 3; index += 1) if (left[index] !== right[index]) return left[index] - right[index];
  return 0;
}

function add(total, value) {
  total[0] += value[0];
  total[1] += value[1];
  total[2] += value[2];
}

function boundary(char) { return char === undefined || !isIdentChar(char); }
function isCombinator(char) { return char === '>' || char === '+' || char === '~'; }
function isSpace(char) { return /\s/.test(char); }
function isIdentStart(char) { return /[A-Za-z_-]/.test(char); }
function isIdentChar(char) { return /[A-Za-z0-9_-]/.test(char); }
function compactRecord(record) { return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)); }

export { selectorSpecificityRecord, splitSelectorList };

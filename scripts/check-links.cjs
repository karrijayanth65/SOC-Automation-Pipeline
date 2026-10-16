'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function decodeEntities(text) {
  const names = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, entity) => {
    if (entity[0] !== '#') return names[entity.toLowerCase()] ?? whole;
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

function withoutFences(text) {
  let fence;
  return text.split(/\r?\n/).map(line => {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (!fence && marker) { fence = marker; return ''; }
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length && /^\s*[`~]+\s*$/.test(line)) fence = undefined;
      return '';
    }
    return line;
  }).join('\n').replace(/<!--[\s\S]*?-->/g, '');
}

function headingSlug(text) {
  return decodeEntities(text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, ''))
    .toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\- ]/gu, '').replace(/ /g, '-');
}

function anchors(text, markdown) {
  const clean = markdown ? withoutFences(text) : text;
  const result = new Set([...clean.matchAll(/\b(?:id|name)\s*=\s*["']([^"']+)["']/gi)].map(m => decodeEntities(m[1])));
  if (!markdown) return result;
  const used = new Set();
  const lines = clean.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const atx = /^\s{0,3}#{1,6}\s+(.+?)(?:\s+#+\s*)?$/.exec(lines[i]);
    const setext = i + 1 < lines.length && /^\s{0,3}(?:=+|-+)\s*$/.test(lines[i + 1]) && lines[i].trim();
    if (!atx && !setext) continue;
    const base = headingSlug(atx ? atx[1] : lines[i].trim());
    let slug = base, count = 0;
    while (used.has(slug)) slug = base + '-' + (++count);
    used.add(slug); result.add(slug);
    if (setext && !atx) i++;
  }
  return result;
}

function links(text, markdown) {
  const clean = (markdown ? withoutFences(text) : text).replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  const found = [...clean.matchAll(/\b(?:href|src)\s*=\s*["']([^"']*)["']/gi)].map(m => decodeEntities(m[1]));
  if (!markdown) return found;
  // Inline links/images; balance nested URL parentheses and permit angle destinations.
  for (const match of clean.matchAll(/\]\(\s*/g)) {
    let position = match.index + match[0].length, value = '', depth = 0;
    const angle = clean[position] === '<';
    if (angle) position++;
    for (; position < clean.length; position++) {
      const ch = clean[position];
      if (ch === '\\' && position + 1 < clean.length) { value += clean[++position]; continue; }
      if (angle && ch === '>') break;
      if (!angle) {
        if ((ch === ')' && depth === 0) || /\s/.test(ch)) break;
        if (ch === '(') depth++;
        if (ch === ')') depth--;
      }
      value += ch;
    }
    if (value) found.push(decodeEntities(value));
  }
  for (const match of clean.matchAll(/^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/gm)) found.push(decodeEntities(match[1] ?? match[2]));
  return [...new Set(found)];
}

function documentFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    if (['.git', 'node_modules'].includes(entry.name) || entry.isSymbolicLink()) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...documentFiles(file));
    else if (/\.(?:md|html?)$/i.test(entry.name)) files.push(file);
  }
  return files;
}

function checkLinks(directory = root) {
  const base = path.resolve(directory), errors = [], cache = new Map();
  const files = documentFiles(base);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const href of links(source, /\.md$/i.test(file))) {
      if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
      try {
        const hash = href.indexOf('#');
        const before = (hash === -1 ? href : href.slice(0, hash)).split('?')[0];
        const pathname = decodeURIComponent(before);
        const fragment = hash === -1 ? '' : decodeURIComponent(href.slice(hash + 1));
        let target = pathname ? path.resolve(pathname.startsWith('/') ? base : path.dirname(file), pathname.replace(/^\//, '')) : file;
        const relative = path.relative(base, target);
        if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) throw new Error('target escapes repository');
        if (!fs.existsSync(target)) throw new Error('missing target');
        if (fs.statSync(target).isDirectory()) {
          const index = ['README.md', 'index.html'].map(name => path.join(target, name)).find(candidate => fs.existsSync(candidate));
          if (!index) { if (fragment) throw new Error('directory fragment has no index'); else continue; }
          target = index;
        }
        // Catch links that pass on Windows but break on GitHub's case-sensitive paths.
        let cursor = base;
        for (const segment of path.relative(base, target).split(path.sep)) {
          if (!fs.readdirSync(cursor).includes(segment)) throw new Error('path casing differs from target');
          cursor = path.join(cursor, segment);
        }
        if (fragment && /\.(?:md|html?|svg)$/i.test(target)) {
          if (!cache.has(target)) cache.set(target, anchors(fs.readFileSync(target, 'utf8'), /\.md$/i.test(target)));
          if (!cache.get(target).has(fragment)) throw new Error('missing fragment #' + fragment);
        }
      } catch (error) { errors.push(path.relative(base, file).replace(/\\/g, '/') + ': ' + href + ' (' + error.message + ')'); }
    }
  }
  return {files: files.length, errors};
}

if (require.main === module) {
  const result = checkLinks();
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
  else console.log('Local links and fragments pass across ' + result.files + ' documentation files.');
}
module.exports = {headingSlug, anchors, links, checkLinks};

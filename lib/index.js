import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const LOG_PREFIX = '[posthtml-value-interpolation]';

const CONFIG_SECTION = 'nubond';
const W3C_COMPLIANT_FLAG = 'compliantWithW3CInterpolation';

const VALUE_ATTRIBUTE_NAME = 'nb-value';
const W3C_COMPLIANT_VALUE_ATTRIBUTE_NAME = 'data-nb-value';

const findPackageJson = startDirectory => {
  let directory = resolve(startDirectory);

  while (true) {
    const candidate = join(directory, 'package.json');
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(directory);
    if (parent === directory) {
      return undefined;
    }

    directory = parent;
  }
};

// Reads the flag from the "nubond" section of the nearest package.json, searched
// upwards from `root` (the current working directory by default — the project
// root under Parcel). A missing package.json or flag means non-compliant mode.
const readPackageJsonFlag = root => {
  const packageJsonPath = findPackageJson(root);
  if (packageJsonPath === undefined) {
    return { isCompliant: false };
  }

  try {
    // editors on Windows may save package.json with a BOM, which JSON.parse rejects
    const content = readFileSync(packageJsonPath, 'utf-8').replace(/^﻿/, '');
    const flag = JSON.parse(content)?.[CONFIG_SECTION]?.[W3C_COMPLIANT_FLAG];

    if (typeof(flag) === 'boolean') {
      return { isCompliant: flag, packageJsonPath };
    } else if (flag !== undefined) {
      console.error(`${LOG_PREFIX} "${CONFIG_SECTION}.${W3C_COMPLIANT_FLAG}" in ${packageJsonPath} must be a boolean`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} cannot read ${packageJsonPath}: ${error.message}`);
  }

  return { isCompliant: false, packageJsonPath };
};

export default (options = {}) => {
  options = options || {};

  let isCompliantByOption;
  if (typeof(options[W3C_COMPLIANT_FLAG]) === 'boolean') {
    isCompliantByOption = options[W3C_COMPLIANT_FLAG];
  } else if (options[W3C_COMPLIANT_FLAG] !== undefined) {
    console.error(`${LOG_PREFIX} "${W3C_COMPLIANT_FLAG}" option must be a boolean, falling back to package.json`);
  }

  let root = process.cwd();
  if (typeof(options.root) === 'string') {
    root = options.root;
  } else if (options.root !== undefined) {
    console.error(`${LOG_PREFIX} "root" option must be a string, falling back to the current working directory`);
  }

  return tree => {
    let isCompliant = isCompliantByOption;

    if (typeof(isCompliant) === 'undefined') {
      // re-read per tree so a reused plugin instance sees a flag change, and reported as
      // a dependency so watching hosts re-run the transform when package.json changes
      const packageJsonFlag = readPackageJsonFlag(root);
      isCompliant = packageJsonFlag.isCompliant;

      if ((packageJsonFlag.packageJsonPath !== undefined) && Array.isArray(tree.messages)) {
        tree.messages.push({ type: 'dependency', file: packageJsonFlag.packageJsonPath, from: tree.options?.from });
      }
    }

    const valueAttributeName = isCompliant ? W3C_COMPLIANT_VALUE_ATTRIBUTE_NAME : VALUE_ATTRIBUTE_NAME;

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
                  result += `<span ${valueAttributeName}="${node.substring(pair.start + 2, pair.end - 1).replaceAll('"', '\'')}"></span>`;
                  startIndex = pair.end + 1;
                } while (index < interpolationIndexes.length);

                if (startIndex < node.length) {
                  result += node.substring(startIndex, node.length);
                }

                nodes[i] = result;
              }
            } else {
              console.error(`${LOG_PREFIX} ${node} contains invalid interpolation`);
            }
          }
        }
      }

      return nodes;
    };

    return treeWalker(tree);
  };
};

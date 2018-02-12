import resolveModule from './modules'

const SPECIAL_TYPES = ['isMemberExpression', 'isProperty']

function isSpecialTypes(t, node) {
  return SPECIAL_TYPES.filter(type => t[type](node)).length > 0
}

export default function({ types: t }) {
  // Tracking variables build during the AST pass. We instantiate
  // these in the `Program` visitor in order to support running the
  // plugin in watch mode or on multiple files.
  let nanoutilss, specified, selectedMethods

  // Import a nanoutils method and return the computed import identifier
  function importMethod(methodName, file, cjs) {
    if (!selectedMethods[methodName]) {
      let path = resolveModule(methodName, cjs)
      selectedMethods[methodName] = file.addImport(path, 'default')
    }
    return t.clone(selectedMethods[methodName])
  }

  function matchesNanoutils(path, name) {
    return (
      nanoutilss[name] &&
      (hasBindingOfType(path.scope, name, 'ImportDefaultSpecifier') ||
        hasBindingOfType(path.scope, name, 'ImportNamespaceSpecifier'))
    )
  }

  function matchesNanoutilsMethod(path, name) {
    return (
      specified[name] && hasBindingOfType(path.scope, name, 'ImportSpecifier')
    )
  }

  function hasBindingOfType(scope, name, type) {
    return scope.hasBinding(name) && scope.getBinding(name).path.type === type
  }

  return {
    visitor: {
      Program: {
        enter() {
          // Track the variables used to import nanoutils
          nanoutilss = Object.create(null)
          specified = Object.create(null)
          // Track the methods that have already been used to prevent dupe imports
          selectedMethods = Object.create(null)
        }
      },
      ImportDeclaration(path) {
        let { node } = path
        if (node.source.value === 'nanoutils') {
          node.specifiers.forEach(spec => {
            if (t.isImportSpecifier(spec)) {
              specified[spec.local.name] = spec.imported.name
            } else {
              nanoutilss[spec.local.name] = true
            }
          })
          path.remove()
        }
      },
      ExportNamedDeclaration(path, state) {
        let { node, hub } = path
        if (node.source && node.source.value === 'nanoutils') {
          let specifiers = node.specifiers.map(spec => {
            let importIdentifier = importMethod(
              spec.exported.name,
              hub.file,
              state.opts.cjs
            )
            let exportIdentifier = t.identifier(spec.local.name)
            return t.exportSpecifier(importIdentifier, exportIdentifier)
          })
          node.specifiers = specifiers
          node.source = null
        }
      },
      ExportAllDeclaration(path) {
        let { node } = path
        if (node.source && node.source.value === 'nanoutils') {
          throw new Error(
            '`export * from "nanoutils"` defeats the purpose of babel-plugin-nanoutils'
          )
        }
      },
      CallExpression(path, state) {
        let { node, hub } = path
        let { name } = node.callee
        if (!t.isIdentifier(node.callee)) return
        if (matchesNanoutilsMethod(path, name)) {
          node.callee = importMethod(specified[name], hub.file, state.opts.cjs)
        }
        if (node.arguments) {
          node.arguments = node.arguments.map(arg => {
            let { name } = arg
            return matchesNanoutilsMethod(path, name)
              ? importMethod(specified[name], hub.file, state.opts.cjs)
              : arg
          })
        }
      },
      MemberExpression(path, state) {
        let { node } = path
        let objectName = node.object.name
        if (!matchesNanoutils(path, objectName)) return
        // R.foo() -> foo()
        let newNode = importMethod(
          node.property.name,
          path.hub.file,
          state.opts.cjs
        )
        path.replaceWith({ type: newNode.type, name: newNode.name })
      },
      Property(path, state) {
        let { node, hub } = path
        if (
          t.isIdentifier(node.key) &&
          node.computed &&
          matchesNanoutilsMethod(path, node.key.name)
        ) {
          node.key = importMethod(
            specified[node.key.name],
            hub.file,
            state.opts.cjs
          )
        }
        if (
          t.isIdentifier(node.value) &&
          matchesNanoutilsMethod(path, node.value.name)
        ) {
          node.value = importMethod(
            specified[node.value.name],
            hub.file,
            state.opts.cjs
          )
        }
      },
      Identifier(path, state) {
        let { node, hub, parent, scope } = path

        let { name } = node
        if (matchesNanoutilsMethod(path, name) && !isSpecialTypes(t, parent)) {
          let newNode = importMethod(specified[name], hub.file, state.opts.cjs)
          path.replaceWith({ type: newNode.type, name: newNode.name })
        } else if (matchesNanoutils(path, name)) {
          // #19, nullify direct references to the nanoutils import (for apply/spread/etc)
          let replacementNode = t.nullLiteral()
          path.replaceWith(replacementNode)
        }
      }
    }
  }
}

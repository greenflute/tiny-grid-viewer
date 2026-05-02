const { TinyGridEditorProvider } = require('./tiny-grid-editor-provider')

exports.activate = function (context) {
  context.subscriptions.push(TinyGridEditorProvider.register(context))
}

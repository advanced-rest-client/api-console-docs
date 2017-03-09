# The `<api-console-docs>` element

This project's goal is to embed the API console into a Chrome extension.

It contains the API console's navigation and documentation viewer.
It does not contains the "try it" screen.

## Using the the element in the content script.

#### Copy source files from `./build/` to your extension package:

```
cp ./build/api-console-docs.html ../path-to-extension/api-console-docs.html
cp ./build/api-console-docs.js ../path-to-extension/api-console-docs.js
```

This files are CSP ready. The `api-console-docs-bundle.html` file is cobining
JavaScript and HTML content into single file.

Note name change when copying. This name will be used in other code examples.

#### List the file in the `manifest.json` file:

```
{
  ...
  "web_accessible_resources": [
    "api-console-docs.html",
    "api-console-docs.js"
  ],
  ...
}
```

#### In content script import the element:

```
var link = document.createElement('link');
link.rel = 'import';
link.href = chrome.extension.getURL('api-console-docs.html');
document.head.appendChild(link)
```

#### Append the script file.
```
var link = document.createElement('script');
link.src = chrome.extension.getURL('api-console-docs.js');
document.body.appendChild(link)
```

#### Append `api-console-docs` element to the document

```
var docs = document.createElement('api-console-docs');
document.body.appendChild(docs);

docs.raml = ramlJson.specification;
```

The element will render the documentation.

Note that the parser output contains the `specification` property and this
property's value should be used as a value for element's `raml` property.

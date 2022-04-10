# duo-ext

## Features

- Activate by inputing code or by pressing a button
- Extension popop lists current duo pushes
- Auto approves duo pushes for requests made in current browser
- Notifications for duo pushes
- Support for multiple sites

## Getting started

Activate duo-ext by going to the duo add devices page of your organization and press the button activate or input activation code from the qr code.

### Build locally

1. Checkout the copied repository to your local machine eg. with `git clone https://github.com/falsidge/duo-ext`
1. run `npm install` to install all required dependencies
1. run `npm run build`

The build step will create the `extension` folder, this folder will contain the generated extension.

### Development

- `npm install` to install dependencies.
- To watch file changes in developement

  - Chrome
    - `npm run dev:chrome`
  - Firefox
    - `npm run dev:firefox`
  - Opera
    - `npm run dev:opera`

- **Load extension in browser**

- ### Chrome

  - Go to the browser address bar and type `chrome://extensions`
  - Check the `Developer Mode` button to enable it.
  - Click on the `Load Unpacked Extension…` button.
  - Select your extension’s extracted directory.

- ### Firefox

  - Load the Add-on via `about:debugging` as temporary Add-on.
  - Choose the `manifest.json` file in the extracted directory

- ### Opera

  - Load the extension via `opera:extensions`
  - Check the `Developer Mode` and load as unpacked from extension’s extracted directory.
  
- To lint code
  - `npm run lint`
  - `npm run lint-fix`

## Extension created using this template

- https://github.com/abhijithvijayan/web-extension-starter
- https://github.com/fregante/browser-extension-template

## License


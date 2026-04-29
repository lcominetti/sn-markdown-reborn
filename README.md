# Markdown Reborn

A Markdown editor with inline style support. Derived from [CodeMirror](https://github.com/codemirror/codemirror) and [Minimal Markdown](https://github.com/standardnotes/plugins/tree/89d47ec07c98afc3af279aa3317f0dc9c24cd379/packages/com.sncommunity.minimal-markdown).

## Setup

1. `npm i` 

2. `grunt`

3. https://docs.standardnotes.org/extensions/local-setup/

### Local Setup

Install http-server:

 npm install -g http-server
 
In your extension's root directory, run the following command to begin hosting your local server:

http-server -p 8001 --cors
The --cors option allows the Standard Notes app to load your extension via cross-origin resource sharing (required).

In your extension's root directory, create a file called ext.json.

Place, at minimum, the following key/value pairs. For the full listing of keys, see the Publishing guide.

{
  "identifier": "org.yourdomain.my-extension",
  "name": "My Extension",
  "content_type": "SN|Component",
  "area": "editor-editor",
  "version": "1.0.0",
  "url": "http://localhost:8001"
}
The url should point to where your extension's index.html is hosted on your local server. The area describes what kind of extension this will be. A list of valid values can be found in the Publishing guide.

In your browser, open http://localhost:8001/ext.json and make sure you see the JSON file content from above.

Copy the url from the JSON content and open it in your browser. Here, you should see your actual extension running. Your server will look for an index.html file by default.

If your main HTML file is called something different, or is not located in the root directory, simply change the url value in the JSON file to reflect this location. For example:

url: "http://localhost:8001/dist/index.html"
At this point, your extension is ready to be installed. Open Standard Notes, and click on Extensions in the lower left corner of the app.

In the bottom right of the Extensions window, click Import Extension. In the Extension Link field, enter the URL of your ext.json file. In this case, it will be http://localhost:8001/ext.json. Then press enter.

You should see a message that your extension was successfully installed. You can now scroll up in the Extensions window, and click Activate next to your extension to run it. If it is an editor, Editors can be activated via the Editor menu in the note panel, under the note title.

## License

[GNU AGPL v3.0](https://choosealicense.com/licenses/agpl-3.0/)

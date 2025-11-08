# URL Paths - Chrome Extension

## Overview

URL Paths is a Chrome extension that allows you to define URL transformation rules that provide instant access to related URLs through convenient buttons in the extension popup. I created it for SharePoint admins, who frequently need to access specific administrative paths for different Sites without navigating through multiple menus (Cogwheel taking forever to load ...) but it can be used for any other Webservice.

## How to Use

### Options Page
Access the extension's options page to create and manage your transformation rules:

1. **Create Rules**: Define a regex pattern that matches the URLs where you want the rule to appear
2. **Use Groups**: Include capture groups in your regex pattern (using parentheses) to extract parts of the URL (used in Transformations)
3. **Add Transformations**: Create multiple transformations for each rule - these are URL rewrites that use the regex groups you defined to build the URL
4. **Button Access**: When you visit a matching site, transformation buttons will appear in the extension popup leading to the respective URL

**Example**: A rule with pattern `https://([^.]+)\.sharepoint\.com/sites/([^/]+)` can capture the tenant name and site name, allowing transformations like:
- Site Contents: `https://{{1}}.sharepoint.com/sites/{{2}}/_layouts/15/viewlsts.aspx`
- Permissions: `https://{{1}}.sharepoint.com/sites/{{2}}/_layouts/15/user.aspx`

### Using the Extension
1. Navigate to any website that matches your defined rules
2. Click the URL Paths extension icon in your browser toolbar
3. Click any of the available transformation buttons to instantly navigate to the related URL

## Testing on Your Machine

To test this extension locally:

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top right corner)
3. Click **Load unpacked**
4. Select the `src` folder from this project
5. The extension will now be loaded and ready to use

You can use the sample rules in `samples/sample-rules.json` as a starting point by importing them through the options page.
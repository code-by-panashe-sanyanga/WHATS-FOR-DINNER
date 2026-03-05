# Assets Folder

This folder contains all static assets for the site including favicons and icons.

## Folder Structure

- **favicon.ico** - Place your website favicon here (32x32 or 16x16 .ico file)
- **icons/** - Contains social media icons
  - **instagram.svg** - Instagram icon (SVG format recommended)
  - **x.svg** - X (Twitter) icon (SVG format recommended)
  - **facebook.svg** - Facebook icon (SVG format recommended)

## How to Add Icons

1. Create SVG files for each social media platform or download them from:
   - FontAwesome (https://fontawesome.com)
   - Material Design Icons (https://fonts.google.com/icons)
   - Feather Icons (https://feathericons.com)

2. Save them as `.svg` files in the `icons/` folder:
   - `icons/instagram.svg`
   - `icons/x.svg`
   - `icons/facebook.svg`

3. The icons will automatically display in the header across all pages.

## How to Add Favicon

1. Create or convert a favicon to `.ico` format (you can use online converters)
2. Save it as `favicon.ico` in this folder
3. The favicon will appear in:
   - Browser tabs
   - Bookmarks
   - History

## Icon Sizing

- Social media icons: Currently set to 20x20px (adjustable in `style.css` under `.social-links img`)
- Favicon: Standard 32x32px or 16x16px

You can modify the size by editing the `height` and `width` properties in the CSS.

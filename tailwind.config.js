/** Tailwind compilado localmente (substitui cdn.tailwindcss.com). Classes tambem sao geradas em strings JS, por isso varremos os .js. */
module.exports = {
  content: ['./index.html', './utils.js', './file-browser.js', './hypha-imagej-service.js', './src/**/*.js', './threadhack/viv-loader/*.js'],
  theme: { extend: {} },
};

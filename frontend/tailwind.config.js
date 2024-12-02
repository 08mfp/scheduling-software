/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', 
  content: [
      "./src/**/*.{js,jsx,ts,tsx}", // Your app's components
      "./node_modules/flowbite/**/*.js" // Include flowbite JS
  ],
  theme: {
      extend: {}
  },
  plugins: [
      require("flowbite/plugin") // Include Flowbite plugin
  ]
};

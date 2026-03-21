import BoothConfigurator from './BoothConfigurator';
function App() { return <BoothConfigurator />; }
export default App;
```

**Step 4 — Test locally**
```
npm start
```

Your browser opens `localhost:3000` and you should see the configurator. If it works, press `Ctrl+C` to stop the server.

**Step 5 — Create a GitHub account and repo**

Go to github.com and sign up if you haven't. Click the **+** icon in the top right, then **New repository**. Name it `boothconfigurator`, leave it public, don't add a README. Click **Create repository**.

**Step 6 — Install Git**

If you don't have Git installed, download it from git-scm.com. On Mac you can also run `xcode-select --install`.

**Step 7 — Push your code to GitHub**

In your terminal, still inside the `booth-configurator` folder:
```
git init
git add .
git commit -m "booth configurator"
git branch -M main
git remote add origin https://github.com/lowbake-paul/booth-configurator.git
git push -u origin main
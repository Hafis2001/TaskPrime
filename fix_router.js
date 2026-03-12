const fs = require('fs');
const path = require('path');
const dirs = ['app', 'app/(drawer)'];
dirs.forEach(d => {
  const dirPath = path.join('c:/Users/AFIS/Desktop/ReactNativeIMC/TaskPrime', d);
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach(f => {
      if (f.endsWith('.js')) {
        const p = path.join(dirPath, f);
        let content = fs.readFileSync(p, 'utf8');
        let oldContent = content;

        if (content.includes('router.push') && content.includes('checkModule')) {
          content = content.replace(/router\.push\([\'\"\`]\/\(drawer\)\/\(tabs\)[\'\"\`]\)/g, 'router.navigate(\"/(drawer)/(tabs)\")');
          content = content.replace(/router\.push\([\'\"\`]\/\(drawer\)\/bank-cash[\'\"\`]\)/g, 'router.navigate(\"/(drawer)/bank-cash\")');
        }

        if (oldContent !== content) {
          fs.writeFileSync(p, content, 'utf8');
          console.log('Fixed router.navigate in ' + p);
        }
      }
    });
  }
});

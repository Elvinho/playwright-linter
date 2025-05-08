import fs from 'fs';
import path from 'path';

const dirPaths = ['./tests', './pages'].map(p => path.resolve(p));

const files = [];
const variableRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*page\.(locator|getBy\w+)\(/g;
const badNames = ['el', 'item', 'thing', 'temp', 'data', 'test', 'foo'];

function walkDir(dir) {
  try {
    fs.readdirSync(dir).forEach(f => {
      const fullPath = path.join(dir, f);
      if (fs.statSync(fullPath).isDirectory()) {
        walkDir(fullPath);
      } else if (f.endsWith('.spec.ts') || f.endsWith('.spec.js') || f.endsWith('.test.ts') || f.endsWith('.test.js') || f.endsWith('Page.ts') ) {
        files.push(fullPath);
      }
    });
  } catch (err) {
    console.error(`Erro ao acessar o diretório: ${dir}`);
    console.error(err.message);
    process.exit(1);
  }
}

function lintFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  const warnings = [];

  if (!content.includes('test.describe')) {
    warnings.push('🔸 Falta uso de "test.describe" para agrupar testes.');
  }

  if (content.includes('test.only')) {
    warnings.push('⚠️  Uso de "test.only" detectado — pode acidentalmente desabilitar outros testes.');
  }

  if (content.includes('test.skip')) {
    warnings.push('⚠️  Uso de "test.skip" detectado — certifique-se de que está intencional.');
  }

  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
  
      if (line.includes('page.click(') && !line.includes('await')) {
        warnings.push(`❗ Linha ${lineNumber}: Uso de "page.click" sem "await".`);
      }
  
      if (line.includes('page.locator(')) {
        warnings.push(`💡 Linha ${lineNumber}: Considere usar "page.getByRole", "getByText", etc. em vez de "locator()".`);
      }
  
      if (line.includes('waitForTimeout')) {
        warnings.push(`⚠️  Linha ${lineNumber}: Evite "waitForTimeout", prefira asserts com "expect".`);
      }
  
      const varMatch = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*page\.(locator|getBy\w+)\(/);
      if (varMatch) {
        const varName = varMatch[1];
  
        if (!/^[a-z][a-zA-Z0-9]*$/.test(varName)) {
          warnings.push(`❌ Linha ${lineNumber}: Variável "${varName}" não segue o padrão camelCase.`);
        }
  
        const badNames = ['el', 'item', 'thing', 'temp', 'data', 'test', 'foo'];
        if (badNames.includes(varName)) {
          warnings.push(`⚠️  Linha ${lineNumber}: Nome de variável "${varName}" é vago. Use nomes mais descritivos como "btnLogin", "txtEmail".`);
        }
  
        if (!/^(btn|txt|lbl|chk|ddl)?[A-Z]/.test(varName[0].toUpperCase() + varName.slice(1))) {
          warnings.push(`💡 Linha ${lineNumber}: Considere usar prefixos como "btn", "txt" para variáveis de locators (ex: "btnSubmit").`);
        }
      }
    });
  
  });


  let match;
  while ((match = variableRegex.exec(content)) !== null) {
    const varName = match[1];

    if (!/^[a-z][a-zA-Z0-9]*$/.test(varName)) {
      warnings.push(`❌ Variável "${varName}" não segue o padrão camelCase.`);
    }

    if (badNames.includes(varName)) {
      warnings.push(`⚠️  Nome de variável "${varName}" é vago. Use nomes mais descritivos como "btnLogin", "txtEmail".`);
    }

    if (!/^(btn|txt|lbl|chk|ddl)?[A-Z]/.test(varName[0].toUpperCase() + varName.slice(1))) {
      warnings.push(`💡 Considere usar prefixos como "btn", "txt" para variáveis de locators (ex: "btnSubmit").`);
    }
  }


  if (warnings.length > 0) {
    console.log(`\n📄 Arquivo: ${filePath}`);
    warnings.forEach(w => console.log(`   ${w}`));
  }
}

dirPaths.forEach((dirPath) => {
  if (fs.existsSync(dirPath)) {
    walkDir(dirPath);
  } else {
    console.warn(`⚠️  Diretório não encontrado: ${dirPath}`);
  }
});

files.forEach(lintFile);

if (files.length === 0) {
  console.warn('⚠️  Nenhum arquivo de teste encontrado.');
}

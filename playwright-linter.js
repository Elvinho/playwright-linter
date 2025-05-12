import fs from 'fs';
import path from 'path';

const dirPaths = ['./tests/commerce', './pages/commerce'].map(p => path.resolve(p));
const files = [];

const variableRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*page\.(?:locator|getBy\w+)\(|readonly\s+([a-zA-Z0-9_]+)\s*:\s*Locator;/g;
const badNames = ['el', 'item', 'thing', 'temp', 'data', 'test', 'foo'];

const elementFinalNames = [
  'Input', 'TextInput', 'EmailInput', 'PasswordInput', 'Textarea', 'SearchInput',
  'Button', 'SubmitButton', 'CancelButton', 'ResetButton', 'IconButton', 'ToggleButton',
  'Link', 'NavLink', 'BreadcrumbLink', 'MenuLink',
  'Dropdown', 'Select', 'Option', 'Checkbox', 'RadioButton', 'Table', 'Row', 'Column', 'ListItem',
  'Label', 'Text', 'Heading', 'Card', 'Modal', 'Tooltip', 'Alert', 'Banner', 'Toast',
  'DatePicker', 'TimePicker', 'Calendar', 'Clock',
  'FileInput', 'UploadButton', 'DownloadLink'
];

function walkDir(dir) {
  try {
    fs.readdirSync(dir).forEach(f => {
      const fullPath = path.join(dir, f);
      if (fs.statSync(fullPath).isDirectory()) {
        walkDir(fullPath);
      } else if (
        f.endsWith('.spec.ts') ||
        f.endsWith('.spec.js') ||
        f.endsWith('.test.ts') ||
        f.endsWith('.test.js') ||
        f.endsWith('Page.ts')
      ) {
        files.push(fullPath);
      }
    });
  } catch (err) {
    console.error(`Erro ao acessar o diretório: ${dir}`);
    console.error(err.message);
    process.exit(1);
  }
}

function checkVariableName(name, lineNumber) {
  const issues = [];

  if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
    issues.push(`❌ Linha ${lineNumber}: Variável "${name}" não segue o padrão camelCase.`);
  }

  if (badNames.includes(name)) {
    issues.push(`⚠️  Linha ${lineNumber}: Nome de variável "${name}" é vago. Use nomes mais descritivos como "btnLogin", "txtEmail".`);
  }

  if (!/^(btn|txt|lbl|chk|ddl)?[A-Z]/.test(name[0].toUpperCase() + name.slice(1))) {
    issues.push(`💡 Linha ${lineNumber}: Considere usar prefixos como "btn", "txt" para locators (ex: "btnSubmit").`);
  }

  if (!elementFinalNames.some(suffix => name.toLowerCase().endsWith(suffix.toLowerCase()))) {
    issues.push(`💡 Linha ${lineNumber}: Variável "${name}" termina com um sufixo comum (ex: Button, Input). Verifique se segue um padrão específico.`);
  }

  return issues;
}

function lintFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const warnings = [];

  if (!filePath.endsWith('Page.ts') && !content.includes('test.describe')) {
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
    const lineNumber = index + 1;

    if (line.includes('page.click(') && !line.includes('await')) {
      warnings.push(`❗ Linha ${lineNumber}: Uso de "page.click" sem "await".`);
    }

    if (line.includes('waitForTimeout')) {
      warnings.push(`⚠️  Linha ${lineNumber}: Evite "waitForTimeout", prefira asserts com "expect".`);
    }

    const varMatch = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*page\.(locator|getBy\w+)\(/);
    if (varMatch) {
      warnings.push(...checkVariableName(varMatch[1], lineNumber));
    }
  });

  let match;
  while ((match = variableRegex.exec(content)) !== null) {
    const varName = match[1] || match[2];
    if (!varName) continue;
    warnings.push(...checkVariableName(varName, 'desconhecida'));
  }

  if (warnings.length > 0) {
    console.log(`\n📄 Arquivo: ${filePath}`);
    warnings.forEach(w => console.log(`   ${w}`));
  }
}

// Executar
dirPaths.forEach(dirPath => {
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

import { Project, SyntaxKind, Node } from "ts-morph";

const project = new Project();
project.addSourceFilesAtPaths("src/services/flashcardService.tsx");

const file = project.getSourceFiles()[0];

// Add import if not exists
const hasAxiosImport = file.getImportDeclaration(imp => imp.getModuleSpecifierValue() === "./axiosConfig");
if (!hasAxiosImport) {
  file.addImportDeclaration({
    defaultImport: "axiosInstance",
    moduleSpecifier: "./axiosConfig"
  });
}

// Remove API_URL
const apiUrlDecl = file.getVariableDeclaration("API_URL");
if (apiUrlDecl) {
  apiUrlDecl.getVariableStatement()?.remove();
}

// Process fetch calls
const fetchCalls = file.getDescendantsOfKind(SyntaxKind.CallExpression).filter(node => node.getExpression().getText() === "fetch");

for (const fetchCall of fetchCalls) {
  const args = fetchCall.getArguments();
  const urlArg = args[0];
  const optionsArg = args[1];
  
  let urlText = urlArg.getText();
  urlText = urlText.replace(/\$\{API_URL\}/g, "");
  
  let method = "get";
  let bodyText = "";
  
  if (optionsArg && Node.isObjectLiteralExpression(optionsArg)) {
    const methodProp = optionsArg.getProperty("method");
    if (methodProp && Node.isPropertyAssignment(methodProp)) {
      method = methodProp.getInitializer()?.getText().replace(/['"]/g, "").toLowerCase() || "get";
    }
    const bodyProp = optionsArg.getProperty("body");
    if (bodyProp && Node.isPropertyAssignment(bodyProp)) {
      const bodyInit = bodyProp.getInitializer();
      if (bodyInit && Node.isCallExpression(bodyInit) && bodyInit.getExpression().getText() === "JSON.stringify") {
        bodyText = bodyInit.getArguments()[0].getText();
      } else if (bodyInit) {
        bodyText = bodyInit.getText();
      }
    }
  }
  
  let axiosCall = `axiosInstance.${method}(${urlText}`;
  if (bodyText && (method === "post" || method === "put" || method === "patch")) {
    axiosCall += `, ${bodyText}`;
  }
  axiosCall += `)`;
  
  fetchCall.replaceWithText(axiosCall);
}

// Process res.json() calls
const jsonCalls = file.getDescendantsOfKind(SyntaxKind.CallExpression).filter(node => node.getExpression().getText() === "res.json");
for (const jsonCall of jsonCalls) {
  jsonCall.replaceWithText("res.data");
}

// Process if (!res.ok) throw new Error(...)
const ifStmts = file.getDescendantsOfKind(SyntaxKind.IfStatement).filter(node => {
  return node.getExpression().getText() === "!res.ok";
});

for (const ifStmt of ifStmts) {
  ifStmt.remove();
}

// Process if (res.ok) { ... }
const ifOkStmts = file.getDescendantsOfKind(SyntaxKind.IfStatement).filter(node => {
  return node.getExpression().getText() === "res.ok";
});

for (const ifStmt of ifOkStmts) {
  ifStmt.getExpression().replaceWithText("res");
}


file.saveSync();
console.log("Fixed flashcardService.tsx");

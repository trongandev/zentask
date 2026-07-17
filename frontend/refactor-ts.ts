import { Project, SyntaxKind, TryStatement, Block, Node } from "ts-morph";
import * as fs from "fs";

const project = new Project();
project.addSourceFilesAtPaths("src/services/**/*.{ts,tsx}");

const files = project.getSourceFiles();

for (const file of files) {
  if (file.getBaseName() === "axiosConfig.ts" || file.getBaseName() === "toastService.ts") {
    continue;
  }
  
  let modified = false;

  // Change import
  const toastImport = file.getImportDeclaration(imp => imp.getModuleSpecifierValue().includes("toastService"));
  if (toastImport) {
    toastImport.remove();
    modified = true;
  }
  
  const apiUrlDecl = file.getVariableDeclaration("API_URL");
  if (apiUrlDecl) {
    apiUrlDecl.getVariableStatement()?.remove();
    modified = true;
  }

  const hasAxiosImport = file.getImportDeclaration(imp => imp.getModuleSpecifierValue() === "./axiosConfig");
  if (!hasAxiosImport) {
    file.addImportDeclaration({
      defaultImport: "axiosInstance",
      moduleSpecifier: "./axiosConfig"
    });
    modified = true;
  }

  const tryStatements = file.getDescendantsOfKind(SyntaxKind.TryStatement);
  for (const tryStmt of tryStatements) {
    const tryBlock = tryStmt.getTryBlock();
    const catchClause = tryStmt.getCatchClause();
    
    if (catchClause) {
      const catchBody = catchClause.getBlock().getText();
      if (catchBody.includes("toastService.error") || catchBody.includes("throw error")) {
        // We want to extract the fetch call from tryBlock and replace the whole TryStatement
        const fetchCall = tryBlock.getFirstDescendant(node => 
          Node.isCallExpression(node) && node.getExpression().getText() === "fetch"
        );
        
        if (fetchCall && Node.isCallExpression(fetchCall)) {
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
          
          let axiosCall = `await axiosInstance.${method}(${urlText}`;
          if (bodyText && (method === "post" || method === "put" || method === "patch")) {
            axiosCall += `, ${bodyText}`;
          }
          axiosCall += `)`;
          
          // Look for return statement in try block
          const returns = tryBlock.getDescendantsOfKind(SyntaxKind.ReturnStatement);
          const hasJsonReturn = returns.some(r => r.getText().includes("res.json()"));
          const hasTrueReturn = returns.some(r => r.getText().includes("return true"));
          
          let replacement = "";
          if (hasJsonReturn) {
            replacement = `const res = ${axiosCall};\nreturn res.data;`;
          } else if (hasTrueReturn) {
            replacement = `${axiosCall};\nreturn true;`;
          } else {
            replacement = `const res = ${axiosCall};\nreturn res.data;`;
          }
          
          tryStmt.replaceWithText(replacement);
          modified = true;
        }
      }
    }
  }

  if (modified) {
    file.saveSync();
    console.log(`Refactored ${file.getBaseName()}`);
  }
}

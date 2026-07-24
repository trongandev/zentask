import { Project, SyntaxKind, JsxOpeningElement, JsxClosingElement, JsxSelfClosingElement } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles("src/**/*.tsx");
let totalFilesModified = 0;
let totalButtonsReplaced = 0;

for (const sourceFile of sourceFiles) {
  let fileModified = false;
  
  // Find all JsxOpeningElements and JsxSelfClosingElements
  const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement);
  const jsxSelfClosingElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement);
  const jsxClosingElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxClosingElement);

  for (const element of [...jsxElements, ...jsxSelfClosingElements, ...jsxClosingElements]) {
    const tagNameNode = element.getTagNameNode();
    if (tagNameNode.getText() === "button") {
      tagNameNode.replaceWithText("Button");
      fileModified = true;
      if (element.getKind() === SyntaxKind.JsxOpeningElement || element.getKind() === SyntaxKind.JsxSelfClosingElement) {
        totalButtonsReplaced++;
      }
    }
  }

  if (fileModified) {
    // Check if Button import exists
    const hasButtonImport = sourceFile.getImportDeclarations().some(importDecl => {
      return importDecl.getNamedImports().some(named => named.getName() === "Button");
    });

    if (!hasButtonImport) {
      sourceFile.addImportDeclaration({
        namedImports: ["Button"],
        moduleSpecifier: "@/src/components/ui/Button"
      });
    }

    totalFilesModified++;
  }
}

console.log(`Saving changes...`);
project.saveSync();
console.log(`Successfully replaced ${totalButtonsReplaced} button(s) across ${totalFilesModified} file(s).`);

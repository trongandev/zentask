import { Project, SyntaxKind } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles("src/**/*.tsx");
let totalFilesModified = 0;
let totalReplacements = {
  input: 0,
  select: 0,
  textarea: 0
};

const tagsToReplace = {
  input: "Input",
  select: "Select",
  textarea: "Textarea"
};

for (const sourceFile of sourceFiles) {
  let fileModified = false;
  let importsNeeded = new Set<string>();
  
  const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement);
  const jsxSelfClosingElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement);
  const jsxClosingElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxClosingElement);

  for (const element of [...jsxElements, ...jsxSelfClosingElements, ...jsxClosingElements]) {
    const tagNameNode = element.getTagNameNode();
    const tagName = tagNameNode.getText();
    
    if (tagName in tagsToReplace) {
      const newTagName = tagsToReplace[tagName as keyof typeof tagsToReplace];
      tagNameNode.replaceWithText(newTagName);
      fileModified = true;
      importsNeeded.add(newTagName);
      
      if (element.getKind() === SyntaxKind.JsxOpeningElement || element.getKind() === SyntaxKind.JsxSelfClosingElement) {
        totalReplacements[tagName as keyof typeof tagsToReplace]++;
      }
    }
  }

  if (fileModified) {
    const existingImports = sourceFile.getImportDeclarations();
    
    importsNeeded.forEach(componentName => {
      const hasImport = existingImports.some(importDecl => {
        return importDecl.getNamedImports().some(named => named.getName() === componentName);
      });

      if (!hasImport) {
        sourceFile.addImportDeclaration({
          namedImports: [componentName],
          moduleSpecifier: `@/src/components/ui/${componentName}`
        });
      }
    });

    totalFilesModified++;
  }
}

console.log(`Saving changes...`);
project.saveSync();
console.log(`Successfully replaced:`);
console.log(`- ${totalReplacements.input} input(s)`);
console.log(`- ${totalReplacements.select} select(s)`);
console.log(`- ${totalReplacements.textarea} textarea(s)`);
console.log(`across ${totalFilesModified} file(s).`);

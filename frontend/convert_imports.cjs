const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const importRegex = /^import\s+\{\s*([A-Za-z0-9_]+)\s*\}\s+from\s+[\"'](\.\/pages\/[^\"']+)[\"'];/gm;
let lazyDecls = [];
code = code.replace(importRegex, (match, name, path) => {
  lazyDecls.push(`const ${name} = lazy(() => import('${path}').then(m => ({ default: m.${name} })));`);
  return '';
});

const defaultImportRegex = /^import\s+([A-Za-z0-9_]+)\s+from\s+[\"'](\.\/pages\/[^\"']+)[\"'];/gm;
code = code.replace(defaultImportRegex, (match, name, path) => {
  lazyDecls.push(`const ${name} = lazy(() => import('${path}'));`);
  return '';
});

// Remove LandingPage import at line 241
code = code.replace(/import \{ LandingPage \} from \"\.\/pages\/LandingPage\";\n/, '');
lazyDecls.push(`const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));`);
code = code.replace(/import \{ BeginnerLessonPractice \} from \"\.\/pages\/Beginner\/BeginnerLessonPractice\";\n/, '');
lazyDecls.push(`const BeginnerLessonPractice = lazy(() => import('./pages/Beginner/BeginnerLessonPractice').then(m => ({ default: m.BeginnerLessonPractice })));`);
code = code.replace(/import \{ AdminCourses \} from \"\.\/pages\/Admin\/AdminCourses\";\n/, '');
lazyDecls.push(`const AdminCourses = lazy(() => import('./pages/Admin/AdminCourses').then(m => ({ default: m.AdminCourses })));`);

// Add lazy, Suspense
code = code.replace('import { useState, useEffect, useRef } from \"react\";', 'import { useState, useEffect, useRef, lazy, Suspense } from \"react\";');

// Insert lazy declarations before ProtectedRouteLayout
code = code.replace('function ProtectedRouteLayout() {', lazyDecls.join('\n') + '\n\nfunction ProtectedRouteLayout() {');

// Wrap Routes with Suspense
code = code.replace('<Routes>', '<Suspense fallback={<div className=\"min-h-screen flex items-center justify-center bg-[#F4F7FE]\"><div className=\"w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin\"></div></div>}>\n      <Routes>');
code = code.replace('</Routes>', '</Routes>\n      </Suspense>');

fs.writeFileSync('src/App.tsx', code);

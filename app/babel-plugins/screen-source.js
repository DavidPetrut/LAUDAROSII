const path = require("path");

/**
 * Plugin Babel: impacheteaza automat componentele exportate din app/screens cu
 * withScreenSource(Comp, "cale/relativa.js"), ca raportul de testare sa stie pe NATIV
 * fisierul real al ecranului/sub-view-ului vizibil (nu doar ruta de baza, care e des gresita).
 *
 * Conservator pe scop: trateaza doar `export const Nume = (arrow|function)` si
 * `export default (function|arrow)` unde corpul intoarce JSX si numele incepe cu majuscula.
 * Nu atinge helperele neexportate si nici alte fisiere in afara de app/screens.
 */
module.exports = function screenSourcePlugin({ types: t }) {
  const LOCAL = "__withScreenSource";
  // Doar componente de tip ecran/view/overlay (nu item-uri de lista ca Card/Row/Badge),
  // ca sa nu adaugam abonari inutile si sa nu poluam stiva de atribuire.
  const SCREENISH = /(Screen|View|Tab|Detail|Reader|Hub|Runner|Player|Picker|Sheet|Modal|Entry|Setup|Lobby|Room|Board|List)$/;
  const isCompName = (name) => typeof name === "string" && /^[A-Z]/.test(name);
  const isScreenish = (name) => isCompName(name) && SCREENISH.test(name);

  // Adevarat daca functia intoarce JSX (corp-expresie JSX sau un JSXElement/Fragment in corp).
  const returnsJSX = (fnPath) => {
    const body = fnPath.node.body;
    if (t.isJSXElement(body) || t.isJSXFragment(body)) return true;
    let found = false;
    fnPath.traverse({
      Function(p) {
        p.skip();
      },
      "JSXElement|JSXFragment"() {
        found = true;
      },
    });
    return found;
  };

  const wrapExpr = (node, relPath) =>
    t.callExpression(t.identifier(LOCAL), [node, t.stringLiteral(relPath)]);

  return {
    name: "screen-source",
    visitor: {
      Program: {
        enter(programPath, state) {
          const filename = state.file.opts.filename || "";
          const norm = filename.split(path.sep).join("/");
          state.__enabled = /\/screens\//.test(norm) && /\.(js|jsx|ts|tsx)$/.test(norm) && !/\.d\.ts$/.test(norm);
          if (!state.__enabled) return;
          const appIdx = norm.lastIndexOf("/app/");
          state.__relPath = appIdx >= 0 ? norm.slice(appIdx + 5) : path.basename(norm);
          state.__base = path.basename(norm).replace(/\.(js|jsx|ts|tsx)$/, "");
          state.__used = false;
        },
        exit(programPath, state) {
          if (!state.__enabled || !state.__used) return;
          const norm = (state.file.opts.filename || "").split(path.sep).join("/");
          const appIdx = norm.lastIndexOf("/app/");
          const fileRel = appIdx >= 0 ? norm.slice(appIdx + 5) : norm;
          const fileDir = path.posix.dirname(fileRel);
          let rel = path.posix.relative(fileDir, "global/testing/screenSource");
          if (!rel.startsWith(".")) rel = "./" + rel;
          programPath.node.body.unshift(
            t.importDeclaration(
              [t.importSpecifier(t.identifier(LOCAL), t.identifier("withScreenSource"))],
              t.stringLiteral(rel)
            )
          );
        },
      },

      ExportNamedDeclaration(p, state) {
        if (!state.__enabled) return;
        const decl = p.node.declaration;
        if (!t.isVariableDeclaration(decl)) return;
        p.get("declaration.declarations").forEach((dPath) => {
          const id = dPath.node.id;
          const initPath = dPath.get("init");
          if (
            t.isIdentifier(id) &&
            isScreenish(id.name) &&
            initPath.node &&
            (t.isArrowFunctionExpression(initPath.node) || t.isFunctionExpression(initPath.node)) &&
            returnsJSX(initPath)
          ) {
            initPath.replaceWith(wrapExpr(initPath.node, state.__relPath));
            state.__used = true;
          }
        });
      },

      ExportDefaultDeclaration(p, state) {
        if (!state.__enabled) return;
        const declPath = p.get("declaration");
        const decl = declPath.node;
        const nameForCheck = (decl && decl.id && decl.id.name) || state.__base;
        if (!isScreenish(nameForCheck)) return;
        if (t.isFunctionDeclaration(decl) && returnsJSX(declPath)) {
          p.node.declaration = wrapExpr(t.toExpression(decl), state.__relPath);
          state.__used = true;
        } else if (
          (t.isArrowFunctionExpression(decl) || t.isFunctionExpression(decl)) &&
          returnsJSX(declPath)
        ) {
          p.node.declaration = wrapExpr(decl, state.__relPath);
          state.__used = true;
        }
      },
    },
  };
};

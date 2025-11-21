import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { analyzeLexicalSyntactic } from "./lexer-parser.js";
import { analyzeSemantics } from "./semantic-analyzer.js";
import { QuadrupleGenerator } from "./intermediate-gen.js";
import { optimizeCode } from "./optimizer.js";

import {
  Code2,
  Play,
  RotateCcw,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Zap,
  Brain,
  Search,
  Layers,
  Rocket,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
} from "lucide-react";

// Componente para mostrar tablas de cuádruplos
const QuadrupleTable = ({ data, emptyMessage }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 italic text-center py-8">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-gray-50 text-gray-700 border-b">
          <tr>
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Operación</th>
            <th className="px-4 py-3 font-medium">Argumento 1</th>
            <th className="px-4 py-3 font-medium">Argumento 2</th>
            <th className="px-4 py-3 font-medium">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-2 text-gray-500 font-mono text-xs">{i}</td>
              <td
                className={`px-4 py-2 font-mono font-medium ${
                  row.op === "GOTO" || row.op === "JUMP_IF_FALSE"
                    ? "text-blue-600"
                    : row.op === "LABEL"
                    ? "text-green-600"
                    : "text-gray-800"
                }`}
              >
                {row.op}
              </td>
              <td className="px-4 py-2 font-mono text-gray-700">
                {row.arg1 !== null ? String(row.arg1) : "-"}
              </td>
              <td className="px-4 py-2 font-mono text-gray-700">
                {row.arg2 !== null ? String(row.arg2) : "-"}
              </td>
              <td className="px-4 py-2 font-mono text-purple-600">
                {row.res !== null ? String(row.res) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Componente de tarjeta de estadística
const StatCard = ({
  icon,
  label,
  value,
  color = "text-gray-700",
  bgColor = "bg-white",
}) => (
  <div
    className={`${bgColor} border border-gray-200 rounded-lg p-4 flex items-center gap-3 shadow-sm`}
  >
    <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
    <div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className={`text-xs font-medium ${color}`}>{label}</div>
    </div>
  </div>
);

// Componente de pestaña
const AnalysisTab = ({ panel, isActive, onClick, hasContent }) => {
  const Icon = panel.icon;
  return (
    <button
      onClick={() => onClick(panel.id)}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-all duration-200 text-sm font-medium ${
        isActive
          ? "border-blue-500 text-blue-700 bg-blue-50"
          : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <Icon size={16} />
      {panel.name}
      {hasContent && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
    </button>
  );
};

function IDE() {
  // Estados principales
  const [code, setCode] = useState(`// Analizador de JavaScript Avanzado
// Ejemplo de código con diferentes construcciones

class Calculator {
  constructor() {
    this.history = [];
    this.precision = 2;
  }
  
  add(a, b) {
    const result = a + b;
    this.history.push(\`\${a} + \${b} = \${result}\`);
    return parseFloat(result.toFixed(this.precision));
  }
  
  divide(a, b) {
    if (b === 0) {
      console.warn("División por cero detectada");
      return Infinity;
    }
    return a / b;
  }
}

const calc = new Calculator();
const sum = calc.add(10, 5);
const division = calc.divide(10, 0);

console.log(undeclaredVariable);`);

  const [lexicalResult, setLexicalResult] = useState("");
  const [syntacticResult, setSyntacticResult] = useState("");
  const [semanticResult, setSemanticResult] = useState("");
  const [intermediateCode, setIntermediateCode] = useState([]);
  const [optimizedCode, setOptimizedCode] = useState([]);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lexical");

  // Nuevo estado para el layout
  const [layout, setLayout] = useState("editorFocus"); // "editorFocus" | "analysisFocus" | "balanced"

  const editorRef = useRef(null);

  // Análisis automático
  useEffect(() => {
    const timer = setTimeout(() => {
      if (code.trim()) {
        handleRunAnalysis(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [code]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith(".js") || file.name.endsWith(".txt"))) {
      const reader = new FileReader();
      reader.onload = () => setCode(reader.result);
      reader.readAsText(file);
    }
  };

  const handleRunAnalysis = async (silent = false) => {
    if (!silent) setIsAnalyzing(true);

    try {
      const lexSyntaxResults = analyzeLexicalSyntactic(code);
      setLexicalResult(lexSyntaxResults.lexicalResult);
      setSyntacticResult(lexSyntaxResults.syntacticResult);

      const ast = lexSyntaxResults.ast;
      let semResults = { result: "", errorCount: 0, warningCount: 0 };

      if (ast) {
        semResults = analyzeSemantics(ast);
        setSemanticResult(semResults.result);

        if (lexSyntaxResults.syntaxErrors === 0) {
          const generator = new QuadrupleGenerator();
          const quads = generator.generate(ast);
          setIntermediateCode(quads);
          const optQuads = optimizeCode(quads);
          setOptimizedCode(optQuads);
        } else {
          setIntermediateCode([]);
          setOptimizedCode([]);
        }
      }

      const stats = {
        lexicalErrors: lexSyntaxResults.lexicalErrors || 0,
        syntaxErrors: lexSyntaxResults.syntaxErrors || 0,
        semanticErrors: semResults.errorCount || 0,
        warnings: semResults.warningCount || 0,
        linesOfCode: code.split("\n").length,
        tokens: lexSyntaxResults.tokenCount || 0,
        characters: code.length,
      };

      setAnalysisStats(stats);
    } catch (error) {
      const errorMsg = "Error durante el análisis: " + error.message;
      setLexicalResult(errorMsg);
      setSyntacticResult(errorMsg);
      setSemanticResult(errorMsg);
    } finally {
      if (!silent) {
        setTimeout(() => setIsAnalyzing(false), 800);
      }
    }
  };

  const handleClearCode = () => {
    setCode("");
    setLexicalResult("");
    setSyntacticResult("");
    setSemanticResult("");
    setIntermediateCode([]);
    setOptimizedCode([]);
    setAnalysisStats(null);
  };

  // Definición de paneles de análisis
  const analysisPanels = [
    {
      id: "lexical",
      name: "Léxico",
      icon: Zap,
      result: lexicalResult,
      type: "text",
    },
    {
      id: "syntactic",
      name: "Sintáctico",
      icon: Search,
      result: syntacticResult,
      type: "text",
    },
    {
      id: "semantic",
      name: "Semántico",
      icon: Brain,
      result: semanticResult,
      type: "text",
    },
    {
      id: "intermediate",
      name: "Intermedio",
      icon: Layers,
      result: intermediateCode,
      type: "table",
    },
    {
      id: "optimized",
      name: "Optimizado",
      icon: Rocket,
      result: optimizedCode,
      type: "table",
    },
  ];

  // Configuraciones de layout
  const layoutConfigs = {
    editorFocus: { editor: "w-full lg:w-2/3", analysis: "w-full lg:w-1/3" },
    analysisFocus: { editor: "w-full lg:w-1/3", analysis: "w-full lg:w-2/3" },
    balanced: { editor: "w-full lg:w-1/2", analysis: "w-full lg:w-1/2" },
  };

  const currentLayout = layoutConfigs[layout];

  const activePanel = analysisPanels.find((panel) => panel.id === activeTab);

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Header Superior */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    ⚠️ Warning Code
                  </h1>
                  <p className="text-xs text-gray-600 hidden sm:block">
                    Ponganos 70, andele
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Selector de Layout */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 hidden sm:block">
                  Layout:
                </span>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                >
                  <option value="editorFocus">Editor Principal</option>
                  <option value="balanced">Vista Balanceada</option>
                  <option value="analysisFocus">Análisis Principal</option>
                </select>
              </div>

              <button
                onClick={() => handleRunAnalysis(false)}
                disabled={isAnalyzing}
                className="flex items-center gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow"
              >
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Play size={16} fill="white" />
                )}
                {isAnalyzing ? "Analizando..." : "Ejecutar Análisis"}
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Herramientas */}
        <div className="bg-gray-50/80 border-t border-gray-200/50 px-4 lg:px-6 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-all duration-200 border border-gray-300 text-sm font-medium shadow-sm hover:shadow">
              <Upload size={16} className="text-gray-600" />
              Subir Archivo
              <input
                type="file"
                accept=".js,.txt"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            <button
              onClick={handleClearCode}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-all duration-200 border border-gray-300 text-sm font-medium shadow-sm hover:shadow"
            >
              <RotateCcw size={16} />
              Limpiar
            </button>

            {/* Estadísticas rápidas */}
            {analysisStats && (
              <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2 text-sm bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      analysisStats.lexicalErrors === 0
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  ></div>
                  <span className="font-medium">Léxico</span>
                </div>
                <div className="flex items-center gap-2 text-sm bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      analysisStats.syntaxErrors === 0
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  ></div>
                  <span className="font-medium">Sintáctico</span>
                </div>
                <div className="flex items-center gap-2 text-sm bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      analysisStats.semanticErrors === 0
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  ></div>
                  <span className="font-medium">Semántico</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal - Layout Horizontal */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
        {/* Panel del Editor */}
        <div
          className={`${currentLayout.editor} flex flex-col border-r border-gray-200`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h2 className="text-lg font-semibold text-gray-900">
                Editor de Código
              </h2>
            </div>
            <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md font-medium">
              {analysisStats ? `${analysisStats.linesOfCode} líneas` : "..."}
            </div>
          </div>
          <div className="flex-1 bg-white">
            <Editor
              height="100%"
              language="javascript"
              value={code}
              onChange={(value) => setCode(value || "")}
              theme="vs"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                lineNumbers: "on",
                tabSize: 2,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                renderLineHighlight: "all",
                bracketPairColorization: { enabled: true },
                glyphMargin: false,
                lineNumbersMinChars: 3,
                padding: { top: 16, bottom: 16 },
              }}
              onMount={(editor) => (editorRef.current = editor)}
            />
          </div>
        </div>

        {/* Panel de Análisis */}
        <div className={`${currentLayout.analysis} flex flex-col bg-gray-50`}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h2 className="text-lg font-semibold text-gray-900">
                Resultados del Análisis
              </h2>
            </div>
            <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md font-medium">
              {analysisStats ? `${analysisStats.tokens} tokens` : "..."}
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Pestañas de Análisis */}
            <div className="border-b border-gray-200 bg-white">
              <div className="flex overflow-x-auto">
                {analysisPanels.map((panel) => {
                  const hasContent =
                    panel.result &&
                    (panel.type === "table"
                      ? panel.result.length > 0
                      : panel.result.trim() !== "");

                  return (
                    <AnalysisTab
                      key={panel.id}
                      panel={panel}
                      isActive={activeTab === panel.id}
                      onClick={setActiveTab}
                      hasContent={hasContent}
                    />
                  );
                })}
              </div>
            </div>

            {/* Contenido de Análisis - Scrollable */}
            <div className="flex-1 overflow-auto">
              <div className="p-6">
                {/* Estadísticas Resumen */}
                {analysisStats && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                      Resumen de Análisis
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard
                        icon={<Zap size={18} className="text-blue-600" />}
                        label="Errores Léxicos"
                        value={analysisStats.lexicalErrors}
                        color={
                          analysisStats.lexicalErrors === 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      />
                      <StatCard
                        icon={<Search size={18} className="text-green-600" />}
                        label="Errores Sintácticos"
                        value={analysisStats.syntaxErrors}
                        color={
                          analysisStats.syntaxErrors === 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      />
                      <StatCard
                        icon={<Brain size={18} className="text-purple-600" />}
                        label="Errores Semánticos"
                        value={analysisStats.semanticErrors}
                        color={
                          analysisStats.semanticErrors === 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      />
                      <StatCard
                        icon={
                          <AlertTriangle size={18} className="text-amber-600" />
                        }
                        label="Advertencias"
                        value={analysisStats.warnings}
                        color={
                          analysisStats.warnings === 0
                            ? "text-gray-600"
                            : "text-amber-600"
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Contenido del panel activo */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-gray-50">
                    <activePanel.icon size={18} className="text-gray-700" />
                    <h3 className="font-semibold text-gray-900">
                      {activePanel.name}
                    </h3>
                  </div>
                  <div className="p-4">
                    {activePanel.type === "table" ? (
                      <QuadrupleTable
                        data={activePanel.result}
                        emptyMessage={`No hay datos de ${activePanel.name.toLowerCase()} para mostrar`}
                      />
                    ) : activePanel.result &&
                      activePanel.result.trim() !== "" ? (
                      <pre className="text-sm font-mono text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-lg border">
                        {activePanel.result}
                      </pre>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FileText
                          size={48}
                          className="mx-auto mb-4 text-gray-300"
                        />
                        <p>No hay resultados para mostrar</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Ejecuta el análisis para ver los resultados
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {!analysisStats && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText
                      size={48}
                      className="mx-auto mb-4 text-gray-300"
                    />
                    <p className="text-lg font-medium text-gray-600">
                      Ejecuta el análisis para ver los resultados
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Los resultados aparecerán aquí después del análisis
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IDE;

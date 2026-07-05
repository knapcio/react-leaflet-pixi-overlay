import { useEffect, useState } from "react";
import BasicDemo from "./demos/BasicDemo";
import basicSource from "./demos/BasicDemo.tsx?raw";
import StressDemo from "./demos/StressDemo";
import stressSource from "./demos/StressDemo.tsx?raw";
import ClusterDemo from "./demos/ClusterDemo";
import clusterSource from "./demos/ClusterDemo.tsx?raw";
import DrawDemo from "./demos/DrawDemo";
import drawSource from "./demos/DrawDemo.tsx?raw";

const DEMOS = [
  {
    hash: "",
    label: "Basic",
    component: BasicDemo,
    source: basicSource,
    sourcePath: "examples/src/demos/BasicDemo.tsx",
  },
  {
    hash: "stress",
    label: "10k markers",
    component: StressDemo,
    source: stressSource,
    sourcePath: "examples/src/demos/StressDemo.tsx",
  },
  {
    hash: "cluster",
    label: "Clustering",
    component: ClusterDemo,
    source: clusterSource,
    sourcePath: "examples/src/demos/ClusterDemo.tsx",
  },
  {
    hash: "draw",
    label: "Custom draw",
    component: DrawDemo,
    source: drawSource,
    sourcePath: "examples/src/demos/DrawDemo.tsx",
  },
] as const;

function currentHash() {
  return window.location.hash.replace(/^#\/?/, "");
}

const App = () => {
  const [hash, setHash] = useState(currentHash);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    const onHashChange = () => setHash(currentHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const demo = DEMOS.find((d) => d.hash === hash) ?? DEMOS[0];
  const Demo = demo.component;
  const sourceUrl = `https://github.com/knapcio/react-leaflet-pixi-overlay/blob/master/${demo.sourcePath}`;

  useEffect(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  }, [demo, showCode]);

  return (
    <>
      <nav className="nav">
        <h1>react-leaflet-pixi-overlay</h1>
        {DEMOS.map((d) => (
          <a
            key={d.label}
            href={`#/${d.hash}`}
            className={d === demo ? "active" : undefined}
          >
            {d.label}
          </a>
        ))}
        <button
          type="button"
          className={showCode ? "code-toggle active" : "code-toggle"}
          aria-pressed={showCode}
          data-testid="code-toggle"
          onClick={() => setShowCode((value) => !value)}
        >
          Code
        </button>
        <a
          className="github"
          href="https://github.com/knapcio/react-leaflet-pixi-overlay"
        >
          GitHub
        </a>
      </nav>
      <main className={showCode ? "demo with-code" : "demo"} data-testid="demo">
        <section className="demo-stage">
          <Demo key={demo.label} />
        </section>
        {showCode ? (
          <aside
            className="code-panel"
            aria-label={`${demo.label} source code`}
            data-testid="code-preview"
          >
            <header className="code-panel-header">
              <span>{demo.sourcePath.replace("examples/src/demos/", "")}</span>
              <a href={sourceUrl}>Open on GitHub</a>
            </header>
            <pre>
              <code>{demo.source}</code>
            </pre>
          </aside>
        ) : null}
      </main>
    </>
  );
};

export default App;

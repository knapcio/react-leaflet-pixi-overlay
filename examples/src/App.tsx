import { useEffect, useState } from "react";
import BasicDemo from "./demos/BasicDemo";
import StressDemo from "./demos/StressDemo";
import ClusterDemo from "./demos/ClusterDemo";
import DrawDemo from "./demos/DrawDemo";

const DEMOS = [
  { hash: "", label: "Basic", component: BasicDemo },
  { hash: "stress", label: "10k markers", component: StressDemo },
  { hash: "cluster", label: "Clustering", component: ClusterDemo },
  { hash: "draw", label: "Custom draw", component: DrawDemo },
] as const;

function currentHash() {
  return window.location.hash.replace(/^#\/?/, "");
}

const App = () => {
  const [hash, setHash] = useState(currentHash);

  useEffect(() => {
    const onHashChange = () => setHash(currentHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const demo = DEMOS.find((d) => d.hash === hash) ?? DEMOS[0];
  const Demo = demo.component;

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
        <a
          className="github"
          href="https://github.com/knapcio/react-leaflet-pixi-overlay"
        >
          GitHub
        </a>
      </nav>
      <main className="demo" data-testid="demo">
        <Demo key={demo.label} />
      </main>
    </>
  );
};

export default App;

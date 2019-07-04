export type layerdSVGProps = {
  SVGSoruces: string[];
  owner: string;
  parent: HTMLElement;
};

export const loadLayerdSVG = (props: layerdSVGProps) => {
  //SVGキャンバスを生成
  let SVGContainer = document.getElementById("svgContainer");
  if (SVGContainer) {
    //既存のSVGChildを削除してinitialize
    while (SVGContainer.firstChild) {
      SVGContainer.removeChild(SVGContainer.firstChild);
    }
  } else {
    //新規作成&ページに追加
    SVGContainer = document.createElement("div");
    SVGContainer.id = "svgContainer";
    SVGContainer.classList.add("svgContainer");
    //props.parent.appendChild(SVGContainer);
    props.parent.insertAdjacentElement("beforeend", SVGContainer);
  }
  //パーサーを生成
  const SVGParser = new DOMParser();

  //配列の数だけSVGをloadしてキャンバスに追加
  props.SVGSoruces.forEach(async url => {
    const loadRequest = await fetch(url);
    const loadedSVGText = await loadRequest.text();
    //const loadedSVG = SVGParser.parseFromString(loadedSVGText, "image/svg+xml");

    //const layerDOM = document.createElement("div");
    //layerDOM.classList.add("layerDOM");
    //layerDOM.insertAdjacentHTML("beforeend", loadedSVGText);
    //SVGContainer.appendChild(layerDOM);
    SVGContainer.insertAdjacentHTML("beforeend", loadedSVGText);
  });
};

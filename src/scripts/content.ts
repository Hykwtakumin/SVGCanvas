import { openCanvas, closeCanvas } from "./components/openCanvas";
import { getPagesWithImage } from "./components/UseScrapbox";
import { TitleImageMap } from "./components/utils";
import { loadLayerdSVG, layerdSVGProps } from "./components/layeredSVG";

window.onload = async () => {
  console.log("content script");
  const observer = new MutationObserver(async (records: MutationRecord[]) => {
    const addedEvent = records.find((record: MutationRecord) => {
      const targetElm = record.target as HTMLElement;
      return targetElm.classList.contains("code-block-start");
    });

    records.forEach((record: MutationRecord) => {
      const target = record.target as HTMLElement;
      //console.log(target);
      if (target.parentElement.classList.contains("code-body")) {
        console.log("this is Codeblock");
        console.log(target);
        console.log(target.innerText);
        //CodeBlockに変更を加える際はObserverをdissconnectする
      }
    });

    if (addedEvent) {
      const modalElm = document.getElementsByClassName("modal-body");
      const codeBlock = document.querySelectorAll(".code-block");
      if (codeBlock) {
        console.dir(codeBlock);
      } else {
        console.log("codeBlock not found");
      }

      if (modalElm) {
        const modalBody = modalElm[0] as HTMLElement;
        const link = modalBody.firstChild as HTMLLinkElement;
        /*SVG以外の場合はここがnullでdrawButtonがつく*/
        if (link.href) {
          /*backGroundScriptにSVGリソースを取得させる*/
          const request = {
            tag: "getImg",
            body: {
              url: link.href
            }
          };
          chrome.runtime.sendMessage(request);
          chrome.runtime.onMessage.addListener(
            async (message, sender, sendResponse) => {
              if (message.tag === "insertSVG") {
                if (message.body) {
                  /*子要素のimgを削除する*/
                  link.removeChild(link.firstChild);
                  /*代わりにSVGを差し込む*/
                  link.insertAdjacentHTML("afterbegin", message.body);
                }
              }
            }
          );
        }
      }
    }
  });

  //ページ中にあるSVGSource
  //SVGがすでにある場合は新しく作るが良いかもしれない
  const svgSources: string[] = [];

  const findCodeBlock = () => {
    const blocks = document.querySelectorAll(".code-block-start");

    if (blocks && blocks.length > 1) {
      console.dir(blocks);
      clearInterval(timerID);
      console.log("code block detected! and timer is Cleared");
      //ここからObserVerで監視
      const observeOption = {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true
      };
      const editor = document.getElementById("editor");
      observer.observe(editor, observeOption);
      //編集者を取得(SVGのIDにつける)
      const owner = document.getElementsByClassName(
        "dropdown-header list-header"
      )[1] as HTMLUListElement;
      if (owner) {
        console.log(`Owner is ${owner.innerText}`);
      }
      blocks.forEach(async block => {
        const source = block.lastChild as HTMLAnchorElement;
        svgSources.push(source.href);
        console.dir(svgSources);
        // const request = await fetch(source.href);
        // const body = await request.text();
        // editor.insertAdjacentHTML("afterend", body);
      });
      loadLayerdSVG({ SVGSoruces: svgSources, owner: "", parent: editor });
    } else {
      console.log("code block is not found now");
    }
  };

  const timerID = setInterval(() => {
    findCodeBlock();
  }, 500);

  const pageList = await getPagesWithImage();
  const imageMap: TitleImageMap[] = pageList.map(page => {
    return { title: page.title, image: page.image } as TitleImageMap;
  });
  console.dir(imageMap);

  const startDrawing = () => {
    /*reactDOMを追加する*/
    openCanvas(imageMap);
  };
  const stopDrawing = () => {
    /*reactDOMを削除する*/
    closeCanvas();
  };

  chrome.storage.onChanged.addListener(details => {
    if (Object.keys(details).includes("mode")) {
      if (details.mode.newValue === true) {
        startDrawing();
      } else if (details.mode.newValue === false) {
        stopDrawing();
      }
    }
  });
};

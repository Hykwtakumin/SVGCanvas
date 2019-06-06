import chromep from "chrome-promise";
import Tab = chrome.tabs.Tab;
import { reloadExtension } from "./components/reloadExtension";
import * as AWS from "aws-sdk";
import {
  ObjectKey,
  Body,
  ObjectCannedACL,
  PutObjectRequest
} from "aws-sdk/clients/s3";

console.log("this is background");
let isDrawingMode: boolean = false;

chrome.runtime.onInstalled.addListener(async details => {
  //await notifiCate("拡張機能がインストールされました!").catch((error) => {console.log(error)});
  chrome.browserAction.enable();
  //モードの初期値を設定
  await chromep.storage.local.set({ mode: false }).catch(e => console.log(e));
  await stopDrawing();
});

const startDrawing = async () => {
  await chromep.storage.local.set({ mode: true }).catch(e => console.log(e));
  chrome.browserAction.setBadgeText({ text: "ON" });
};

const stopDrawing = async () => {
  await chromep.storage.local.set({ mode: false }).catch(e => console.log(e));
  chrome.browserAction.setBadgeText({ text: "" });
};

const pasteToClipBoard = (text: string) => {
  const textArea = document.createElement("textarea");
  document.body.appendChild(textArea);
  textArea.value = text;
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
};

const upload = async (data: any, fileName: string) => {
  const revivedBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  console.dir(revivedBlob);
  const formData = new FormData();
  formData.append(`file`, revivedBlob);
  const request = await fetch(
    `https://hyper-illust-creator.herokuapp.com/api/upload`,
    {
      method: "POST",
      body: formData,
      mode: "cors"
    }
  );
  // const request = await fetch(`http://127.0.0.1:3000/api/upload`, {
  //   method: "POST",
  //   body: formData,
  //   mode: "cors"
  // });
  const response = await request.json();
  console.dir(response);
  const activeTab = (await chromep.tabs.query({ active: true })) as Tab[];
  const targetId = activeTab[0].id;
  if (response && response.ok) {
    pasteToClipBoard(response.url);
    chrome.tabs.sendMessage(targetId, {
      tag: "uploaded",
      body: response.url
    });
  } else {
    chrome.tabs.sendMessage(targetId, {
      tag: "uploadFailed",
      body: "upload is failed!"
    });
  }
};

//拡張機能のボタンを押すとお絵かきモードが起動
chrome.browserAction.onClicked.addListener(tab => {
  if (
    chrome.runtime.lastError &&
    chrome.runtime.lastError.message.match(/cannot be scripted/)
  ) {
    window.alert("It is not allowed to use this extension in this page.");
    chrome.browserAction.disable();
    reloadExtension();
  }

  if (isDrawingMode != true) {
    startDrawing();
  } else {
    stopDrawing();
  }
  isDrawingMode = !isDrawingMode;
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const msg = message;
  if (msg.tag === "getImg") {
    const request = await fetch(msg.body.url as string, {
      method: "GET",
      mode: "cors"
    });
    const svg = await request.text();
    const response = {
      tag: "insertSVG",
      body: svg
    };
    const activeTab = (await chromep.tabs.query({ active: true })) as Tab[];
    const targetId = activeTab[0].id;
    chrome.tabs.sendMessage(targetId, response);
  } else if (msg.tag === "getImg64") {
    /*取得後Base64にして返却*/
    const request = await fetch(
      `http://127.0.0.1:3000/proxy/${encodeURI(msg.body.url)}` as string,
      {
        method: "GET",
        mode: "cors"
      }
    );
    const image = await request.json();

    const data = image.data;
    console.dir(data);

    const response = {
      tag: "loadBase64",
      body: data
    };
    const activeTab = (await chromep.tabs.query({ active: true })) as Tab[];
    const targetId = activeTab[0].id;
    chrome.tabs.sendMessage(targetId, response);

    // const fileReader = new FileReader();
    // fileReader.onload = async function() {
    //   const dataURI = this.result;
    //   const response = {
    //     tag: "loadBase64",
    //     body: dataURI
    //   };
    //   const activeTab = (await chromep.tabs.query({ active: true })) as Tab[];
    //   const targetId = activeTab[0].id;
    //   chrome.tabs.sendMessage(targetId, response);
    // };
    // fileReader.readAsDataURL(image);
  } else if (msg.tag === "upload2s3") {
    //const result = await upLoad2s3(msg.body, msg.name);
    //console.dir(result);
  } else if (msg.tag === "upload") {
    const blobUrl = msg.body;
    const xhr = new XMLHttpRequest();

    xhr.addEventListener("load", async () => {
      const blobBuffer = xhr.response;
      await upload(blobBuffer, msg.name);
      sendResponse();
    });

    xhr.open("GET", blobUrl);
    xhr.responseType = "arraybuffer";
    xhr.send();

    // const result = await upload(msg.body, msg.name);
    // console.dir(result);
  }
});

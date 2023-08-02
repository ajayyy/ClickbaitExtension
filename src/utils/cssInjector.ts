import { isFirefoxOrSafari, waitFor } from "../../maze-utils/src";
import Config from "../config/config";
import { brandingBoxSelector, watchPageThumbnailSelector } from "../videoBranding/videoBranding";
import { logError } from "./logger";
import { getThumbnailElements } from "../../maze-utils/src/thumbnail-selectors";
import { onMobile } from "../../maze-utils/src/pageInfo";

const cssFiles = [
    "content.css",
    "shared.css"
];

export function addCssToPage() {
    const head = document.getElementsByTagName("head")[0] || document.documentElement;

    // Add css related to hiding branding boxes by default
    const style = document.createElement("style");
    style.className = "cb-css";
    style.innerHTML = buildHideThumbnailCss() + buildHideTitleCss();

    head.appendChild(style);

    const onLoad = async () => {
        await waitFor(() => Config.isReady());

        const head = document.getElementsByTagName("head")[0];
        if (!isFirefoxOrSafari() && Config.config!.invidiousInstances.includes(new URL(document.URL).host)) {
            for (const file of cssFiles) {
                const fileref = document.createElement("link");
                fileref.className = "cb-css";
                fileref.rel = "stylesheet";
                fileref.type = "text/css";
                fileref.href = chrome.runtime.getURL(file);

                head.appendChild(fileref);
            }
        }

        if (onMobile()) {
            setTimeout(() => injectMobileCss(), 200);
        }
    };
    

    if (document.readyState === "complete") {
        onLoad().catch(logError);
    } else {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        window.addEventListener("DOMContentLoaded", onLoad);
    }
}

function buildHideThumbnailCss(): string {
    const result: string[] = [
        ".ytp-ce-covering-image:not(.cb-visible)", // Endcards
        "div.ytp-autonav-endscreen-upnext-thumbnail:not(.cb-visible)", // Autoplay
        "div.ytp-videowall-still-image:not(.cb-visible)" // End recommendations
    ];

    const boxesToHide = brandingBoxSelector.split(", ").concat([
        "ytd-video-preview"
    ]);
    for (const start of boxesToHide) {
        const thumbnailTypes = getThumbnailElements();

        for (const thumbnailType of thumbnailTypes) {
            result.push(`${start} ${thumbnailType} img:not(.cb-visible, ytd-moving-thumbnail-renderer img, .cbCustomThumbnailCanvas)`);
        }
    }

    result.push(`${watchPageThumbnailSelector} div:not(.cb-visible)`);

    return `${result.join(", ")} { visibility: hidden !important; }\n`;
}

function buildHideTitleCss(): string {
    const result: string[] = [];
    for (const start of brandingBoxSelector.split(", ")) {
        if (!onMobile()) {
            result.push(`${start} #video-title:not(.cbCustomTitle)`);
        } else {
            result.push(`${start} .media-item-headline .yt-core-attributed-string:not(.cbCustomTitle)`);
        }
    }

    if (onMobile()) {
        result.push(".compact-media-item-headline .yt-core-attributed-string:not(.cbCustomTitle)");
    }

    return `${result.join(", ")} { display: none !important; }\n`;
}

function injectMobileCss() {
    const head = document.getElementsByTagName("head")[0];

    const style = document.createElement("style");
    style.className = "cb-mobile-css";
    style.innerHTML = buildMobileCss();

    head.appendChild(style);
}

function buildMobileCss(): string {
    if (!onMobile()) return "";

    const html = document.getElementsByTagName("html")[0];
    if (html) {
        const style = window.getComputedStyle(html);
        if (style) {
            const color = style.getPropertyValue("color");
            return `
                :root {
                    --yt-spec-text-primary: ${color};
                }
            `;
        }
    }

    return "";
}
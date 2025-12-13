import { initWelcomePage } from "../pages/WelcomePage";
import { initChatPage } from "../pages/ChatPage";

const routes = [
    {
        path: /\/welcome/,
        component: initWelcomePage,
    },
    {
        path: /\/chat/,
        component: initChatPage,
    },
];

export function initRouter(container: Element) {
    function handleRoute(route: string) {
        for (const r of routes) {
            if (r.path.test(route)) {
                const el = r.component(container);
                if (el) {
                    // Component initializes itself into container
                }
            }
        }
    }

    if (location.pathname === "/" || location.pathname === "/index.html") {
        goTo("/welcome");
    } else {
        handleRoute(location.pathname);
    }

    window.onpopstate = function () {
        handleRoute(location.pathname);
    };
}

export function goTo(path: string, params?: Record<string, string>) {
    let url = path;
    if (params) {
        const searchParams = new URLSearchParams(params);
        url = `${path}?${searchParams.toString()}`;
    }
    history.pushState({}, "", url);
    const event = new PopStateEvent("popstate");
    dispatchEvent(event);
}

export function getQueryParam(param: string): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

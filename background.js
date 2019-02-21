// chrome.pageAction.show()

chrome.runtime.onMessage.addListener((req, sender) => {
  if (sender.tab) {
    chrome.pageAction.show(sender.tab.id)
    chrome.pageAction.setIcon({
      tabId: sender.tab.id,
      path: 'icons/128.png'
    })
    chrome.pageAction.setPopup({
      tabId: sender.tab.id,
      popup: 'popups/404.html'
    })
  }
})
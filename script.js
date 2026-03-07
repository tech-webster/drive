(function () {
  const ROOT_PATH = ".";
  let currentDirectoryPath = ROOT_PATH;
  const contentEl = document.getElementById("content");
  const breadcrumbEl = document.getElementById("breadcrumb");
  const modalDialog = document.getElementById("app-dialog");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalFooter = document.getElementById("modal-footer");
  const modalClose = document.getElementById("modal-close");
  const uploadInput = document.getElementById("upload-input");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  let currentDirectoryItems = [];
  let currentSearchQuery = "";
  const classes = {
    breadcrumbLink:
      "rounded-[6px] px-2 py-1 text-drive-accent no-underline transition-colors duration-150 hover:bg-drive-accent/15 hover:text-drive-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-drive-accent motion-reduce:transition-none",
    breadcrumbCurrent: "font-medium text-drive-text",
    breadcrumbSlash: "text-drive-muted",
    emptyState:
      "rounded-[14px] border border-dashed border-drive-border-strong bg-drive-surface px-6 py-8 text-center text-[0.9375rem] text-drive-muted shadow-[0_4px_24px_rgba(0,0,0,0.25)]",
    searchMeta: "mt-2 text-xs text-drive-faint",
    loading: "p-8 text-center text-[0.9375rem] text-drive-muted",
    errorToast:
      "fixed left-1/2 bottom-6 z-[3000] rounded-[10px] bg-drive-text px-6 py-3 text-sm font-medium text-drive-bg shadow-[0_12px_40px_rgba(0,0,0,0.4)] -translate-x-1/2",
    fileList:
      "m-0 list-none rounded-[14px] border border-drive-border bg-drive-surface p-0 shadow-[0_4px_24px_rgba(0,0,0,0.25)]",
    fileItem:
      "relative flex min-h-14 items-center gap-4 border-b border-drive-border px-4 py-3 transition-colors duration-150 hover:bg-drive-surface-hover motion-reduce:transition-none last:border-b-0 first:rounded-t-[14px] last:rounded-b-[14px]",
    fileIcon: "flex w-10 shrink-0 items-center justify-center text-drive-muted",
    folderIcon: "text-xl text-drive-accent",
    fileIconGlyph: "text-xl",
    fileName:
      "m-0 flex-1 rounded-[6px] border-0 bg-transparent px-0 py-1 text-left font-medium text-inherit outline-none transition-colors duration-150 hover:text-drive-accent focus-visible:ring-2 focus-visible:ring-drive-accent motion-reduce:transition-none",
    fileMeta: "shrink-0 text-xs text-drive-muted max-[600px]:hidden",
    fileActions: "flex shrink-0 items-center gap-1",
    tooltipWrap: "group relative inline-flex",
    fileActionButton:
      "inline-flex cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent p-2 text-drive-muted transition-colors duration-150 hover:bg-drive-surface-hover hover:text-drive-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-drive-accent motion-reduce:transition-none",
    deleteButton: "hover:bg-drive-danger/12 hover:text-drive-danger",
    tooltip:
      "pointer-events-none absolute right-0 bottom-full z-30 mb-2 hidden whitespace-nowrap rounded-[6px] border border-drive-border bg-drive-panel px-2 py-1 text-xs font-medium text-drive-text shadow-[0_8px_24px_rgba(0,0,0,0.35)] group-hover:block group-focus-within:block",
    previewImage: "block max-h-[70vh] max-w-full rounded-[6px]",
    previewText:
      "max-h-[60vh] overflow-auto whitespace-pre-wrap break-words text-sm leading-[1.6] text-drive-text",
    modalText: "text-drive-muted",
    modalLabel: "mb-2 block text-sm font-medium text-drive-text",
    modalInput:
      "w-full rounded-[10px] border border-drive-border-strong bg-drive-panel px-3 py-2 text-[0.9375rem] text-drive-text outline-none placeholder:text-drive-faint focus:border-drive-accent focus:ring-2 focus:ring-drive-accent/15",
    modalInputError:
      "border-drive-danger focus:border-drive-danger focus:ring-drive-danger/15",
    modalInlineError: "mt-2 text-sm text-drive-danger",
    buttonBase:
      "inline-flex cursor-pointer items-center gap-2 rounded-[10px] border px-4 py-2 text-sm font-medium touch-manipulation transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-drive-accent motion-reduce:transition-none",
    buttonNeutral:
      "border-drive-border-strong bg-drive-surface text-drive-text hover:border-drive-muted hover:bg-drive-surface-hover",
    buttonPrimary:
      "border-drive-accent bg-drive-accent text-drive-bg hover:border-drive-accent-hover hover:bg-drive-accent-hover",
    buttonDanger:
      "border-drive-danger bg-drive-danger text-white hover:border-drive-danger-hover hover:bg-drive-danger-hover",
    buttonDisabled: "pointer-events-none opacity-60",
  };

  function isAuthError(err) {
    if (!err) return false;
    var msg = (err.message || err.toString || "").toString();
    return (
      msg.indexOf("403") !== -1 ||
      msg.indexOf("Forbidden") !== -1 ||
      err.status === 403 ||
      err.statusCode === 403
    );
  }

  function initializeTwDrive() {
    if (typeof puter === "undefined" || !puter.auth) {
      setTimeout(initializeTwDrive, 50);
      return;
    }
    if (puter.auth.isSignedIn()) {
      loadCurrentDirectory();
    } else {
      contentEl.innerHTML =
        '<div class="' +
        classes.emptyState +
        '">Sign in with Puter in another tab or window to use TW Drive here.</div>';
      renderBreadcrumbTrail();
    }
  }

  function showError(message) {
    const el = document.createElement("div");
    el.className = classes.errorToast;
    el.setAttribute("aria-live", "polite");
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 3000);
  }

  function parseErrorPayload(err) {
    if (!err) return null;
    if (typeof err === "string") {
      try {
        return JSON.parse(err);
      } catch (parseFailure) {
        return { message: err };
      }
    }
    if (typeof err.message === "string") {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed && typeof parsed === "object") return parsed;
      } catch (parseFailure) {
        return { message: err.message };
      }
    }
    if (typeof err === "object") return err;
    return null;
  }

  function getDisplayErrorMessage(err, fallbackMessage) {
    const payload = parseErrorPayload(err);
    if (payload && typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
    return fallbackMessage;
  }

  function clearInlineDialogError() {
    const inputEl = document.getElementById("modal-input");
    const errorEl = document.getElementById("modal-inline-error");
    if (inputEl) {
      inputEl.classList.remove(...classes.modalInputError.split(" "));
      inputEl.removeAttribute("aria-invalid");
      inputEl.removeAttribute("aria-describedby");
    }
    if (errorEl) {
      errorEl.remove();
    }
  }

  function showInlineDialogError(message) {
    const inputEl = document.getElementById("modal-input");
    if (!inputEl) {
      showError(message);
      return;
    }

    clearInlineDialogError();
    inputEl.classList.add(...classes.modalInputError.split(" "));
    inputEl.setAttribute("aria-invalid", "true");
    inputEl.setAttribute("aria-describedby", "modal-inline-error");

    const errorEl = document.createElement("p");
    errorEl.id = "modal-inline-error";
    errorEl.className = classes.modalInlineError;
    errorEl.textContent = message;
    inputEl.insertAdjacentElement("afterend", errorEl);
    inputEl.focus();
    inputEl.select();
  }

  function setModalSubmittingState(isSubmitting) {
    const confirmBtn = document.getElementById("modal-confirm");
    const deleteBtn = document.getElementById("modal-confirm-delete");
    const cancelBtn = document.getElementById("modal-cancel");
    const inputEl = document.getElementById("modal-input");
    const buttons = [confirmBtn, deleteBtn, cancelBtn].filter(Boolean);
    const disabledClasses = classes.buttonDisabled.split(" ");

    buttons.forEach(function (button) {
      button.disabled = isSubmitting;
      button.setAttribute("aria-disabled", isSubmitting ? "true" : "false");
      disabledClasses.forEach(function (className) {
        button.classList.toggle(className, isSubmitting);
      });
    });

    if (inputEl) {
      inputEl.disabled = isSubmitting;
      inputEl.setAttribute("aria-busy", isSubmitting ? "true" : "false");
    }
  }

  function renderBreadcrumbTrail() {
    var parts =
      currentDirectoryPath === ROOT_PATH ? [] : currentDirectoryPath.split("/");
    var html =
      '<a href="#" class="' +
      classes.breadcrumbLink +
      '" data-path="' +
      escapeAttr(ROOT_PATH) +
      '">Home</a>';
    var acc = "";
    parts.forEach(function (name, index) {
      acc = acc ? acc + "/" + name : name;
      if (index < parts.length - 1) {
        html +=
          ' <span class="' +
          classes.breadcrumbSlash +
          '">/</span> <a href="#" class="' +
          classes.breadcrumbLink +
          '" data-path="' +
          escapeAttr(acc) +
          '">' +
          escapeHtml(name) +
          "</a>";
      }
    });
    if (parts.length > 0) {
      html +=
        ' <span class="' +
        classes.breadcrumbSlash +
        '">/</span> <span class="' +
        classes.breadcrumbCurrent +
        '">' +
        escapeHtml(parts[parts.length - 1]) +
        "</span>";
    } else {
      html =
        '<a href="#" class="' +
        classes.breadcrumbLink +
        '" data-path="' +
        escapeAttr(ROOT_PATH) +
        '">Home</a> <span class="' +
        classes.breadcrumbCurrent +
        '">/</span>';
    }
    breadcrumbEl.innerHTML = html;
    breadcrumbEl.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        currentDirectoryPath = a.getAttribute("data-path") || ROOT_PATH;
        loadCurrentDirectory();
      });
    });
  }

  function escapeAttr(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML.replace(/"/g, "&quot;");
  }
  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function formatSize(bytes) {
    if (bytes === undefined || bytes === null) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(timestamp) {
    if (timestamp === undefined || timestamp === null) return "—";
    const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    const d = new Date(ms);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }

  function isBlobLike(value) {
    return typeof Blob !== "undefined" && value instanceof Blob;
  }

  function toTextContent(value) {
    if (typeof value === "string") return Promise.resolve(value);
    if (isBlobLike(value)) return value.text();
    return Promise.resolve(String(value || ""));
  }

  function createImagePreviewUrl(fileData, name) {
    const isSvg = /\.svg$/i.test(name);
    if (isSvg) {
      return toTextContent(fileData).then(function (text) {
        return URL.createObjectURL(
          new Blob([text], { type: "image/svg+xml;charset=utf-8" }),
        );
      });
    }

    if (isBlobLike(fileData)) {
      return Promise.resolve(URL.createObjectURL(fileData));
    }

    return Promise.resolve(
      URL.createObjectURL(new Blob([fileData], { type: "application/octet-stream" })),
    );
  }

  function buttonClasses(variant) {
    if (variant === "primary") {
      return classes.buttonBase + " " + classes.buttonPrimary;
    }
    if (variant === "danger") {
      return classes.buttonBase + " " + classes.buttonDanger;
    }
    return classes.buttonBase + " " + classes.buttonNeutral;
  }

  function emptyStateMarkup(message, detail) {
    return (
      '<div class="' +
      classes.emptyState +
      '">' +
      escapeHtml(message) +
      (detail
        ? '<p class="' + classes.searchMeta + '">' + escapeHtml(detail) + "</p>"
        : "") +
      "</div>"
    );
  }

  function normalizeSearchQuery(value) {
    return value.trim().toLowerCase();
  }

  function setSearchUiState() {
    const hasQuery = currentSearchQuery.length > 0;
    searchClear.hidden = !hasQuery;
    searchForm.setAttribute("data-has-query", hasQuery ? "true" : "false");
  }

  function getFilteredDirectoryItems() {
    if (!currentSearchQuery) return currentDirectoryItems;
    return currentDirectoryItems.filter(function (item) {
      const name =
        item.name ||
        item.path.split("/").filter(Boolean).pop() ||
        item.path ||
        "";
      return name.toLowerCase().includes(currentSearchQuery);
    });
  }

  function iconActionButtonMarkup(config) {
    const buttonClass =
      classes.fileActionButton + (config.extraClass ? " " + config.extraClass : "");
    return (
      '<span class="' +
      classes.tooltipWrap +
      '">' +
      '<button type="button" data-action="' +
      escapeAttr(config.action) +
      '" class="' +
      buttonClass +
      '" aria-label="' +
      escapeAttr(config.label) +
      '">' +
      '<i class="' +
      escapeAttr(config.iconClass) +
      ' text-sm" aria-hidden="true"></i>' +
      "</button>" +
      '<span role="tooltip" class="' +
      classes.tooltip +
      '">' +
      escapeHtml(config.label) +
      "</span>" +
      "</span>"
    );
  }

  function loadCurrentDirectory() {
    contentEl.innerHTML =
      '<div class="' + classes.loading + '" aria-live="polite">Loading…</div>';
    renderBreadcrumbTrail();

    puter.fs
      .readdir(currentDirectoryPath)
      .then(function (items) {
        currentDirectoryItems = items;
        renderDirectoryItems();
      })
      .catch(function (err) {
        currentDirectoryItems = [];
        if (isAuthError(err)) {
          contentEl.innerHTML = emptyStateMarkup(
            "Sign in with Puter to access this folder.",
          );
          showError("Please sign in to continue");
        } else {
          contentEl.innerHTML = emptyStateMarkup(
            "Could not load folder.",
            String(err && err.message ? err.message : err),
          );
          showError("Could not load folder");
        }
      });
  }

  function renderDirectoryItems() {
    if (currentDirectoryItems.length === 0) {
      contentEl.innerHTML = emptyStateMarkup(
        "This folder is empty. Create a folder or upload a file.",
      );
      return;
    }

    const items = getFilteredDirectoryItems();
    if (items.length === 0) {
      contentEl.innerHTML = emptyStateMarkup(
        "No matching items found.",
        'Try a different search for "' + currentSearchQuery + '".',
      );
      return;
    }

        const ul = document.createElement("ul");
        ul.className = classes.fileList;
        items.forEach(function (item) {
          const li = document.createElement("li");
          li.className = classes.fileItem;
          const isDir = item.is_dir === true;
          const iconClass = isDir
            ? "fa-solid fa-folder"
            : "fa-solid fa-file";
          const name =
            item.name ||
            item.path.split("/").filter(Boolean).pop() ||
            item.path;
          li.innerHTML =
            '<span class="' +
            classes.fileIcon +
            '" aria-hidden="true"><i class="' +
            iconClass +
            " " +
            (isDir ? classes.folderIcon : classes.fileIconGlyph) +
            '"></i></span>' +
            '<button type="button" data-role="item-name" class="' +
            classes.fileName +
            '" data-path="' +
            escapeAttr(item.path) +
            '" data-isdir="' +
            (isDir ? "1" : "0") +
            '">' +
            escapeHtml(name) +
            "</button>" +
            '<span class="' +
            classes.fileMeta +
            '">' +
            (item.size !== undefined ? formatSize(item.size) : "—") +
            " · " +
            formatDate(item.created) +
            "</span>" +
            '<div class="' +
            classes.fileActions +
            '">' +
            (isDir
              ? ""
              : iconActionButtonMarkup({
                  action: "open",
                  label: "Open file",
                  iconClass: "fa-solid fa-up-right-from-square",
                })) +
            iconActionButtonMarkup({
              action: "rename",
              label: "Rename",
              iconClass: "fa-solid fa-pen",
            }) +
            iconActionButtonMarkup({
              action: "delete",
              label: "Delete",
              iconClass: "fa-solid fa-trash",
              extraClass: classes.deleteButton,
            }) +
            "</div>";
          ul.appendChild(li);
        });
        contentEl.innerHTML = "";
        contentEl.appendChild(ul);

        ul.querySelectorAll('[data-role="item-name"]').forEach(function (el) {
          el.addEventListener("click", function () {
            const path = this.getAttribute("data-path");
            const isDir = this.getAttribute("data-isdir") === "1";
            if (isDir) {
              currentDirectoryPath = path.replace(/\/$/, "") || ROOT_PATH;
              loadCurrentDirectory();
            } else {
              openFilePreview(path);
            }
          });
        });
        ul.querySelectorAll('[data-action="open"]').forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const path = e.target
              .closest("li")
              .querySelector('[data-role="item-name"]')
              .getAttribute("data-path");
            openFilePreview(path);
          });
        });
        ul.querySelectorAll('[data-action="rename"]').forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const path = e.target
              .closest("li")
              .querySelector('[data-role="item-name"]')
              .getAttribute("data-path");
            openRenameDialog(path);
          });
        });
        ul.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const path = e.target
              .closest("li")
              .querySelector('[data-role="item-name"]')
              .getAttribute("data-path");
            openDeleteDialog(path);
          });
        });
  }

  function openFilePreview(path) {
    modalTitle.textContent = path.split("/").filter(Boolean).pop() || path;
    modalBody.innerHTML =
      '<div class="' + classes.loading + '" aria-live="polite">Loading…</div>';
    modalFooter.innerHTML = "";
    modalDialog.showModal();

    puter.fs
      .stat(path)
      .then(function (stat) {
        const name = (stat.name || path).toLowerCase();
        const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name);
        return puter.fs.read(path).then(function (fileData) {
          if (isImage) {
            return createImagePreviewUrl(fileData, name).then(function (url) {
              modalBody.innerHTML =
                '<img class="' +
                classes.previewImage +
                '" src="' +
                url +
                '" alt="Preview">';
              modalDialog.addEventListener(
                "modal-close-cleanup",
                function cleanup() {
                  URL.revokeObjectURL(url);
                  modalDialog.removeEventListener(
                    "modal-close-cleanup",
                    cleanup,
                  );
                },
                { once: true },
              );
            });
          } else if (/\.(txt|md|json|js|css|html|log)$/i.test(name)) {
            toTextContent(fileData).then(function (text) {
              modalBody.innerHTML =
                '<pre class="' +
                classes.previewText +
                '">' +
                escapeHtml(text) +
                "</pre>";
            });
          } else {
            modalBody.innerHTML =
              '<p class="' +
              classes.modalText +
              '">Preview not available. File: ' +
              escapeHtml(name) +
              " (" +
              formatSize(stat.size) +
              ")</p>";
          }
        });
      })
      .catch(function (err) {
        modalBody.innerHTML =
          '<p class="' +
          classes.modalText +
          '">Could not open file. ' +
          escapeHtml(String(err && err.message ? err.message : err)) +
          "</p>";
        showError("Could not open file");
      });
  }

  function openDeleteDialog(path) {
    const name = path.split("/").filter(Boolean).pop() || path;
    modalTitle.textContent = "Delete?";
    modalBody.innerHTML =
      '<p class="' +
      classes.modalText +
      '">Delete <strong>' +
      escapeHtml(name) +
      "</strong>? This cannot be undone.</p>";
    modalFooter.innerHTML =
      '<button type="button" class="' +
      buttonClasses("neutral") +
      '" id="modal-cancel"><i class="fa-solid fa-xmark text-sm" aria-hidden="true"></i><span>Cancel</span></button><button type="button" class="' +
      buttonClasses("danger") +
      '" id="modal-confirm-delete" data-path="' +
      escapeAttr(path) +
      '"><i class="fa-solid fa-trash text-sm" aria-hidden="true"></i><span>Delete</span></button>';
    modalDialog.showModal();
  }

  function openActionDialog(options) {
    const dialogTitles = {
      rename: "Rename",
      newFolder: "New folder",
    };
    const fieldLabels = {
      rename: "New name",
      newFolder: "Folder name",
    };
    const fieldPlaceholders = {
      rename: "",
      newFolder: "Folder name",
    };
    const primaryButtonLabels = {
      rename: "Rename",
      newFolder: "Create",
    };
    const actionType = options.type;
    const value = options.value || "";
    modalTitle.textContent = dialogTitles[actionType];
    modalBody.innerHTML =
      '<label for="modal-input" class="' +
      classes.modalLabel +
      '">' +
      escapeHtml(fieldLabels[actionType]) +
      "</label>" +
      '<input type="text" id="modal-input" class="' +
      classes.modalInput +
      '" value="' +
      escapeAttr(value) +
      '" placeholder="' +
      escapeAttr(fieldPlaceholders[actionType]) +
      '" autocomplete="off"' +
      (options.path ? ' data-path="' + escapeAttr(options.path) + '"' : "") +
      ">" +
      '<p id="modal-inline-error" class="' +
      classes.modalInlineError +
      ' hidden" aria-live="polite"></p>';
    modalFooter.innerHTML =
      '<button type="button" class="' +
      buttonClasses("neutral") +
      '" id="modal-cancel"><i class="fa-solid fa-xmark text-sm" aria-hidden="true"></i><span>Cancel</span></button>' +
      '<button type="button" class="' +
      buttonClasses("primary") +
      '" id="modal-confirm"><i class="fa-solid fa-check text-sm" aria-hidden="true"></i><span>' +
      primaryButtonLabels[actionType] +
      "</span></button>";
    modalDialog.showModal();

    const inputEl = document.getElementById("modal-input");
    clearInlineDialogError();
    inputEl.focus();
    inputEl.select();
  }

  function openRenameDialog(path) {
    const name = path.split("/").filter(Boolean).pop() || path;
    openActionDialog({ type: "rename", path: path, value: name });
  }

  function closeModal() {
    if (modalDialog.open) {
      modalDialog.close();
    }
    modalDialog.dispatchEvent(new Event("modal-close-cleanup"));
  }

  modalFooter.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.id;
    if (id === "modal-cancel") {
      closeModal();
    } else if (id === "modal-confirm") {
      const inputEl = document.getElementById("modal-input");
      if (!inputEl) return;
      clearInlineDialogError();
      const val = inputEl.value.trim();
      if (!val) {
        showInlineDialogError("Please enter a value");
        return;
      }
      setModalSubmittingState(true);
      const title = modalTitle.textContent;
      if (title === "Rename") {
        const path = inputEl.dataset.path;
        puter.fs.rename(path, val).then(function () {
          closeModal();
          loadCurrentDirectory();
        }).catch(function (err) {
          setModalSubmittingState(false);
          showInlineDialogError(getDisplayErrorMessage(err, "Rename failed"));
        });
      } else if (title === "New folder") {
        const fullPath =
          currentDirectoryPath === ROOT_PATH
            ? val
            : currentDirectoryPath + "/" + val;
        puter.fs.mkdir(fullPath).then(function () {
          closeModal();
          loadCurrentDirectory();
        }).catch(function (err) {
          setModalSubmittingState(false);
          showInlineDialogError(
            getDisplayErrorMessage(err, "Failed to create folder"),
          );
        });
      }
    } else if (id === "modal-confirm-delete") {
      setModalSubmittingState(true);
      const path = btn.dataset.path;
      puter.fs.delete(path).then(function () {
        closeModal();
        loadCurrentDirectory();
      }).catch(function (err) {
        setModalSubmittingState(false);
        showError(getDisplayErrorMessage(err, "Delete failed"));
        closeModal();
      });
    }
  });

  modalBody.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      const btn = document.getElementById("modal-confirm");
      if (btn) btn.click();
    }
  });

  modalClose.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });
  modalDialog.addEventListener("click", function (e) {
    if (e.target === modalDialog) closeModal();
  });
  modalDialog.addEventListener("cancel", function (e) {
    e.preventDefault();
    closeModal();
  });
  modalDialog.addEventListener("close", function () {
    modalDialog.dispatchEvent(new Event("modal-close-cleanup"));
  });

  document
    .getElementById("btn-new-folder")
    .addEventListener("click", function () {
      openActionDialog({
        type: "newFolder",
        value: "",
      });
    });

  document.getElementById("btn-upload").addEventListener("click", function () {
    uploadInput.click();
  });
  searchInput.addEventListener("input", function () {
    currentSearchQuery = normalizeSearchQuery(searchInput.value);
    setSearchUiState();
    renderDirectoryItems();
  });
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && searchInput.value) {
      e.preventDefault();
      searchInput.value = "";
      currentSearchQuery = "";
      setSearchUiState();
      renderDirectoryItems();
    }
  });
  searchClear.addEventListener("click", function () {
    searchInput.value = "";
    currentSearchQuery = "";
    setSearchUiState();
    renderDirectoryItems();
    searchInput.focus();
  });
  searchForm.addEventListener("submit", function (e) {
    e.preventDefault();
  });
  uploadInput.addEventListener("change", function () {
    if (!uploadInput.files || uploadInput.files.length === 0) return;
    const targetDirectoryPath =
      currentDirectoryPath === ROOT_PATH ? ROOT_PATH : currentDirectoryPath;
    puter.fs
      .upload(uploadInput.files, targetDirectoryPath)
      .then(function () {
        uploadInput.value = "";
        loadCurrentDirectory();
      })
      .catch(function (err) {
        if (isAuthError(err)) {
            contentEl.innerHTML =
              '<div class="' +
              classes.emptyState +
              '">Sign in with Puter to upload files.</div>';
            showError("Please sign in to continue");
          } else {
            showError(getDisplayErrorMessage(err, "Upload failed"));
          }
        uploadInput.value = "";
      });
  });

  initializeTwDrive();
})();

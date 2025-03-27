import { dict_lang } from "../static/i18n.js";
import { Ref } from "./subroute/project.js";
import { getContentPath, getTypeByPath } from "./storage.js";
import { extensions } from "./storage.js";
import { ModelTools, getListOfResources } from "./subroute/model.js";

const langStrings = [];

const system = {};
system.lang = "ru";

function icon_file(icon_name) {
  return "static/icons/icon_" + icon_name + ".png";
}

function getAttr(el, attr, value = null) {
  if (el && el.hasAttribute(attr)) return el.getAttribute(attr);
  return value;
}

function setAttr(el, attr, value) {
  el.setAttribute(attr, value);
  return el;
}

function addAttr(el, attr, value) {
  const v = getAttr(el, attr);
  setAttr(el, attr, v ? v + " " + value : value);
  return el;
}

function addAttrs(el, attrs) {
  for (var key in attrs) addAttr(el, key, attrs[key]);
  return el;
}

export function setLang(lang) {
  system.lang = lang;
  for (let i in langStrings) {
    let langString = langStrings[i];
    langString.text();
  }
}

export function setEnable(el, flag = true) {
  el.enable = flag;
  if (el.enable) {
    el.classList.remove("disabled");
    el.classList.add("panel");
  } else {
    el.classList.remove("panel");
    el.classList.add("disabled");
  }
}

export function setLabel(el, text, classes = "widget-label", styles) {
  if (text) {
    if (!el.label) {
      el.label = autoWH(nText(el, text, classes, styles));
    }
    el.label.text(text);
  }
  return el;
}

export function setIcon(el, icon, classes) {
  if (icon) {
    if (!el.icon) {
      el.icon = nIcon(el, icon, classes);
    }
    const [icon_name, icon_classes] = icon.split(":");
    el.icon.scr = icon_file(icon_name);
    if (icon_classes) setClasses(el, icon_classes);
  }
  return el;
}

export function setOnChange(el, do_change) {
  el.do_change = do_change;
  return el;
}

export function setClasses(el, classes) {
  if (classes) {
    const class_list = classes.split(" ");
    for (let i in class_list) {
      addAttr(el, "class", class_list[i]);
    }
  }
  return el;
}

export function setStyles(el, styles) {
  if (styles) {
    for (var key in styles) {
      el.style[key] = styles[key];
    }
  }
  return el;
}

export function autoWH(el) {
  return setStyles(el, { width: null, height: null });
}
export function fullWH(el) {
  return setStyles(el, { width: "100%", height: "100%" });
}

export function doVisual(el, rule) {
  el.style["display"] = rule ? "flex" : "none";
}
export function doHide(el) {
  doVisual(el, false);
}
export function doShow(el) {
  doVisual(el, true);
}

export function setHeight(el, value) {
  setStyles(el, { height: value, "min-height": value, "max-height": value });
}
export function setWidth(el, value) {
  setStyles(el, { width: value, "min-width": value, "max-width": value });
}

export function setParent(el, parent) {
  if (parent) {
    const real_parent = parent.get_parent ? parent.get_parent() : parent;
    real_parent.appendChild(el);
    if (parent.do_parent) parent.do_parent(el);
  }
  return el;
}

export function clearParent(el, parent) {
  if (parent) {
    if (parent.do_remove) parent.do_remove(el);
    else parent.removeChild(el);
  }
  return el;
}

export function nLink(el, event_type, func, msg) {
  if (func)
    el.addEventListener(event_type, () => {
      func(msg);
    });
  return el;
}

export function setOverflow(el, mode = "auto") {
  return setStyles(el, { overflow: mode });
}

export function nDiv(el, classes, styles, type = "div") {
  const t = type.split(":");
  const item = document.createElement(t[0]);
  if (t[1]) item.type = t[1];
  setStyles(item, { display: "flex" });
  setClasses(item, classes);
  setStyles(item, styles);
  setParent(item, el);
  item.do_clear = () => {
    item.innerHTML = "";
  };
  return item;
}

export function nFrame(el, classes, styles) {
  const no_frame = nDiv(el, classes, styles);
  setStyles(no_frame, { overflow: "hidden" });
  const frame = nDiv(no_frame);
  setStyles(frame, { overflow: "auto", width: "100%", height: "100%" });
  return frame;
}

export function nIcon(el, icon, classes = "") {
  const [icon_name, icon_classes] = icon.split(":");
  const item = nDiv(el, "icon " + icon_classes + " " + classes);
  const img = document.createElement("img");
  img.src = icon_file(icon_name);
  setParent(img, item);
  return item;
}

export function nText(el, text, classes, styles) {
  const item = nDiv(el, classes, styles);

  setClasses(item, "text");
  item.text = (text) => {
    if (text) {
      text = "" + text;
      const alias = dict_lang[text.toLowerCase()];
      if (alias) {
        item.text_set = alias;
        if (!item.text_set.default) item.text_set.default = text;
        langStrings.push(item);
      } else {
        item.text_set = { default: text };
      }
    }
    if (item.text_set)
      item.innerText = item.text_set[system.lang]
        ? item.text_set[system.lang]
        : item.text_set.default;
  };

  item.text(text);
  return item;
}

export function nTextArea(el, text, cols = "40", rows = "5", classes, styles) {
  if (text) {
    const item = nDiv(el, classes, styles, "textarea");
    item.text = (text) => {
      if (text) {
        if (dict_lang[text]) {
          item.text_set = dict_lang[text];
          if (!item.text_set.default) item.text_set.default = text;
          langStrings.push(item);
        } else {
          item.text_set = { default: text };
        }
      }
      if (item.text_set) {
        if (item.text_set[system.lang])
          item.textContent = item.text_set[system.lang];
        else item.textContent = item.text_set.default;
      }
    };
    item.text(text);
    item.cols = cols;
    item.rows = rows;
    return item;
  }
}

export function nHref(el, text, href, classes, styles) {
  const item = nText(el, text, classes, styles);
  if (item) {
    setClasses(item, "href");
    item.href = href;
    return item;
  }
}

export function nImage(el, image, classes, styles) {
  if (image) {
    const div = nDiv(el, classes);
    const item = document.createElement("img");
    item.src = image;
    setClasses(item, "image margin");
    setStyles(item, styles);
    return setParent(item, div);
  }
}

export function nDownloadFile(data, filename) {
  const df = {};
  df.do_download = () => {
    const link = document.createElement("a");
    const content = JSON.stringify(data, null, "\t");
    const file = new Blob([content], { type: "text/plain" });
    link.href = URL.createObjectURL(file);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return df;
}

export function nInputFile(onload = (file) => {}, types) {
  const el = document.createElement("input");
  el.setAttribute("type", "file");
  if (types) {
    let accept = "";
    types.forEach((type) => {
      accept = accept + extensions[type] + ", ";
    });
    el.setAttribute("accept", accept);
  }
  el.setAttribute("style", "display:none");
  el.addEventListener(
    "change",
    () => {
      const file = el.files[0];
      file.extension = file.name.split(".").pop().toLowerCase();
      getContentPath(file, onload);
    },
    false
  );
  el.do_select = () => {
    el.click();
  };
  return el;
}

export function nButton(parent, label, icon, do_order = null, classes, styles) {
  const el = nDiv(parent, "row panel");

  function do_change() {
    if (el.enable && do_order) do_order();
  }

  setIcon(el, icon, "margin-small");
  setLabel(el, label, "label margin-small");
  setClasses(el, classes);
  setStyles(el, styles);
  setEnable(el, true);

  nLink(el, "pointerdown", do_change);
  return el;
}

export function nTrigger(parent, do_change = (index) => {}) {
  const div = nDiv(parent);
  div.index = 0;

  div.do_parent = (child) => {
    setStyles(child, { display: div.children.length == 1 ? "flex" : "none" });
  };

  div.set_index = (index) => {
    div.children[div.index].style["display"] = "none";
    div.index = index;
    div.children[div.index].style["display"] = "flex";
    if (do_change) do_change(index);
  };

  div.do_next = () => {
    const index = (div.index + 1) % div.children.length;
    div.set_index(index);
  };

  nLink(div, "pointerdown", div.do_next);
  return div;
}

export function nSelector(parent, classes, styles, do_change = (index) => {}) {
  const div = nDiv(parent, classes, styles);
  let selector = null;

  div.do_parent = (child) => {
    if (!selector) {
      selector = child;
      selector.classList.add("selected");
    }

    nLink(child, "pointerdown", () => {
      selector.classList.remove("selected");
      selector = child;
      selector.classList.add("selected");
    });
  };

  return div;
}

export function nFolder(parent, title, classes, styles) {
  const widget = nDiv(parent, "grow column " + classes, styles);

  const holder = nDiv(widget, "row");
  const folder = nDiv(widget, "column shoulder");

  const marker = nTrigger(holder, () => {
    if (marker.index) {
      doHide(folder);
    } else {
      doShow(folder);
    }
    if (widget.do_order) widget.do_order(marker.index);
  });

  nIcon(marker, "folder_open");
  nIcon(marker, "folder_close");

  const header = nDiv(holder, "row");
  if (title) nText(header, title);

  widget.header = header;
  widget.do_open = () => {
    marker.set_index(0);
  };
  widget.do_close = () => {
    marker.set_index(1);
  };
  widget.do_clear = () => {
    folder.do_clear();
  };

  widget.do_remove = (item) => {
    folder.removeChild(item);
    return item;
  };

  widget.get_parent = (item) => {
    return folder;
  };

  widget.do_open();

  return widget;
}

export function nTabs(parent, vert = false) {
  const container = nDiv(
    parent,
    (vert ? "row" : "column") + " grow alt-border grow"
  );
  const header = nDiv(container, vert ? "column" : "row");
  const items = nDiv(container, "column grow alt-border");
  setWidth(header, "15vh");
  let offset = 0;

  function do_visual(item, rule) {
    doVisual(item, rule);
    doVisual(item.icon_open, rule);
    doVisual(item.icon_close, !rule);
    if (vert) {
      if (rule) setStyles(item.holder, { "margin-left": "0vh" });
      else setStyles(item.holder, { "margin-left": "2vh" });
    }
  }

  container.do_select = (index) => {
    if (index < items.children.length) {
      do_visual(items.children[offset], false);
      do_visual(items.children[index], true);
      offset = index;
    }
  };

  container.addTab = (label, icon = null, classes, styles) => {
    const index = items.children.length;
    const item = nDiv(items, "border background margin grow");
    const holder = nDiv(
      header,
      "row border background panel margin " + (vert ? "btl bbl" : "btl btr")
    );
    setStyles(holder, { "justify-content": vert ? "left" : "center" });
    item.holder = holder;
    item.icon_open = nIcon(holder, "sun");
    item.icon_close = nIcon(holder, "unsun");
    item.label = nText(holder, label);
    nLink(holder, "click", () => {
      container.do_select(index);
    });
    do_visual(item, !index);
    return item;
  };

  return container;
}

export function nPanels(parent, classes, styles) {
  const container = nDiv(parent, classes, styles);
  let offset = 0;

  function do_visual(item, rule) {
    doVisual(item.panel, rule);
    doVisual(item.icon_open, rule);
    doVisual(item.icon_close, !rule);
  }

  container.do_select = (index) => {
    if (index < container.children.length) {
      do_visual(container.children[offset], false);
      do_visual(container.children[index], true);
      offset = index;
    }
  };

  container.addPanel = (label, icon = null) => {
    const index = container.children.length;
    const item = nDiv(container, "column background border margin btl bbr");
    const holder = nDiv(item, "row panel margin btl bbr");
    item.icon_open = nIcon(holder, "sun");
    item.icon_close = nIcon(holder, "unsun");
    item.label = nText(holder, label);
    item.panel = nDiv(item, "column shoulder");
    nLink(holder, "click", () => {
      container.do_select(index);
    });
    do_visual(item, !index);
    return item.panel;
  };

  return container;
}

export function nPanel(parent, classes, styles) {
  const widget = nDiv(parent, "row " + classes, styles);
  return widget;
}

const widgets = [];

export function updateWidgets() {
  widgets.forEach((widget) => {
    // widget.updateValue();
    if (widget.style.display === "flex" && !widget.property.enable())
      doHide(widget);
    if (widget.style.display !== "flex" && widget.property.enable())
      doShow(widget);
  });
}

function registryWidget(widget) {
  widgets.push(widget);
  widget.updateValue();
  return widget;
}

export function superWidget(el, classes = "widget grow", property, label) {
  const container = nDiv(el, classes);
  const widget = nDiv(container, "row");
  widget.property = property;
  if (label) setLabel(widget, label);

  widget.tabIndex = -1;
  //widget.style.zIndex = 10;
  widget.current = null;

  // widget.input = nDiv( widget, 'widget-', null, 'input' );

  widget.container = () => {
    return container;
  };

  widget.setValue = (value) => {
    if (widget.input) widget.input.value = value;
  };
  widget.setProperty = (value) => {
    widget.property.set(value);
  };
  widget.getProperty = () => {
    return widget.property.get();
  };

  widget.updateValue = () => {
    widget.setValue(widget.getProperty());
  };

  widget.changeValue = (newValue, force = false) => {
    if (widget.current != newValue || force) {
      const oldValue = widget.current;
      widget.setProperty(newValue);
      widget.updateValue();
      widget.current = newValue;
      if (widget.do_change) widget.do_change(newValue, oldValue);
    }
  };

  return widget;
}

function option(obj, property, key, value) {
  const v = property.option(key, value);
  if (v) obj[key] = v;
}

const mods = {
  properties: (widget) => {
    widget.input = nFolder(widget, widget.property.name, "alt-border");
    Ref.properties.getList(widget.property).forEach((rec) => {
      const [property, name, path] = rec;
      nWidget(widget.input, property, property.label).do_change = (
        newValue,
        oldValue
      ) => {
        if (widget.do_change) widget.do_change(newValue, oldValue);
      };
    });
  },

  string: (widget) => {
    widget.input = nDiv(widget, "widget-string", null, "input");
    widget.input.type = "string";
    widget.input.onchange = () => {
      widget.changeValue(widget.input.value || "?????");
    };
  },

  path: (widget) => {
    const fs = nInputFile((file) => {
      widget.changeValue(file.filePath);
    });
    nButton(widget, null, "path", fs.do_select);
    widget.input = nDiv(widget, "widget-string", null, "input:string");
    widget.input.onchange = () => {
      widget.changeValue(widget.input.value);
    };
  },

  textarea: (widget) => {
    widget.input = nDiv(widget, "widget-textarea", null, "textarea");
    widget.input.rows = "5";
    widget.text = widget.setValue;
    widget.input.onchange = () => {
      widget.changeValue(widget.input.value || "?????");
    };
  },

  number: (widget) => {
    widget.input = nDiv(widget, "widget-number", null, "input:number");
    option(widget.input, widget.property, "min");
    option(widget.input, widget.property, "max");
    option(widget.input, widget.property, "step");
    widget.input.onchange = () => {
      widget.changeValue(parseFloat(widget.input.value) || 0);
    };
  },

  range: (widget) => {
    widget.input = nDiv(widget, "widget-range", null, "input:range");
    option(widget.input, widget.property, "min");
    option(widget.input, widget.property, "max");
    option(widget.input, widget.property, "step");

    widget.metric = nDiv(widget, "widget-metric", null, "input:number");
    option(widget.metric, widget.property, "min");
    option(widget.metric, widget.property, "max");
    option(widget.metric, widget.property, "step");

    widget.setValue = (value) => {
      widget.input.value = value;
      widget.metric.value = value;
    };
    widget.input.onchange = () => {
      widget.changeValue(parseFloat(widget.input.value) || 0);
    };
    widget.metric.onchange = () => {
      widget.changeValue(parseFloat(widget.metric.value) || 0);
    };
  },

  vector: (widget) => {
    const vals = Array(4);

    const panel = nFolder(widget, null, "widget-string grow");
    panel.do_close();

    ["X: ", "Y: ", "Z: "].forEach((val, index) => {
      const v = nDiv(panel, "widget alt-border row grow");
      nText(v, val);
      vals[index] = nDiv(v, "widget-number grow", null, "input:number");
      vals[index].min = -100;
      vals[index].max = 100;
      vals[index].step = 0.01;
      vals[index].onchange = setValue;
    });
    vals[3] = nDiv(panel.header, "widget-number grow", null, "input:number");
    vals[3].min = -100;
    vals[3].max = 100;
    vals[3].step = 0.01;
    vals[3].onchange = setValue;

    function setValue() {
      const [x, y, z, w] = [
        parseFloat(vals[0].value),
        parseFloat(vals[1].value),
        parseFloat(vals[2].value),
        parseFloat(vals[3].value),
      ];
      widget.changeValue({ x: x, y: y, z: z, w: w });
    }

    widget.setValue = (value) => {
      [vals[0].value, vals[1].value, vals[2].value, vals[3].value] = [
        value.x,
        value.y,
        value.z,
        value.w,
      ];
    };
  },

  color: (widget) => {
    widget.input = nDiv(widget, "widget-string", null, "input");
    widget.input.type = "color";
    widget.input.onchange = () => {
      widget.changeValue(widget.input.value || "?????");
    };
  },

  checkbox: (widget) => {
    widget.input = nDiv(widget, "widget-checkbox", null, "input");
    widget.input.type = "checkbox";
    widget.input.checked = widget.property.get();
    widget.setValue = (value) => {
      widget.input.checked = value;
    };
    widget.input.addEventListener("change", (event) => {
      widget.changeValue(widget.input.checked ? true : false);
    });
  },

  select: function (widget) {
    widget.input = nDiv(widget, "widget-select", null, "select");
    let options = widget.property.option("options", []);
    if (typeof options === "function") options = options();
    if (options) {
      options.forEach((option) => {
        const opt = nDiv(widget.input, "widget-option", null, "option");
        opt.value = option;
        opt.textContent = option;
      });
      widget.input.onchange = () => {
        widget.changeValue(widget.input.value);
      }; /// ???
    }
  },

  resource: (widget) => {
    let type = widget.property.option("datatype");
    let types = type ? [type] : widget.property.option("datatypes");
    if (!types) types = [getTypeByPath(widget.property.get()).type];

    function fillOptions() {
      const list = getListOfResources(types);
      list.forEach((item) => {
        const opt = nDiv(widget.input, "widget-option", null, "option");
        opt.value = item;
        opt.textContent = item;
      });
    }

    const fs = nInputFile(async (file) => {
      const path = file.filePath;
      const res = await ModelTools.getResource(path);
      if (res) {
        fillOptions();
        widget.changeValue(path);
      }
    }, types);

    const nc = nDiv(widget, "column");
    const nr = nDiv(nc, "row");

    nButton(nr, null, "path", fs.do_select);
    widget.input = nDiv(nr, "widget-select", null, "select");
    // if( type === 'text' ) {
    //     widget.textstring = nDiv( nc, 'widget', null, 'select' );
    // }

    fillOptions();
    widget.input.onchange = () => {
      widget.changeValue(widget.input.value);
    };
  },
};

export function nWidget(el, prop, label) {
  let property = prop;
  if (property.enable()) {
    // const [ref, name] = getPropertyBy( property );
    // if( ref ) property = ref[name];
    const widget = superWidget(
      el,
      "widget-input column" + (property.hook ? " hook-border" : ""),
      property,
      property.type === "properties" ? null : label
    );
    mods[property.type](widget);
    return registryWidget(widget);
  }
}

// export function wHierdim( parent, property, set_icon = ( item ) => { return 'empty'; }, set_label = ( item ) => { return item.toString(); } ) {
//     const widget = nWidget( parent, 'widget-hierdim', property );

//     function setHier( parent, item ) {
//         const header = nDiv( parent, 'row panel' );
//         nIcon( header, set_icon( item ) );
//         nText( header, set_label( item ) );

//         nLink( header, 'click' , () => { widget.changeValue( item ); } );
//         nLink( header, 'dragstart', () => { alert( item ) } );

//         if( item === obj[param] ) {
//             setClasses( header, 'active-border' );
//             //setStyles( header, { 'draggable':'true' } );
//             header.draggable = true;
//             //widget.scrollTop = header.offsetTop;
//             //header.scrollIntoView();
//         }

//         if( item.children ) {
//             const folder = nFolder( parent );
//             setParent( header, folder.header );
//             item.children.forEach( ( child, index ) => {
//                 setHier( folder, child );
//             } );
//         }
//     }

//     widget.setValue = ( value )=>{
//         widget.do_clear();
//         let root = obj[param];
//         if( root ) {
//             while( root.parent ) root = root.parent;
//             setHier( widget, root );
//         }
//     }

//     return registryWidget( widget );
// }

const icon_list = ["hier_item", "hier_last", "hier_pipe", "hier_level1"];

export function nHierlist(parent, property) {
  const widget = superWidget(parent, "widget-hierlist", property);

  (widget.drag = (sour, dest) => {}),
    (widget.set_icon = (item) => {
      return "empty";
    }),
    (widget.set_label = (item) => {
      return item.toString();
    }),
    (widget.set_list = (item) => {
      return item.children ? item.children : [];
    }),
    (widget.set_header = (el, item) => {
      nIcon(el, widget.set_icon(item));
      nText(el, widget.set_label(item));
    });

  widget.helper_enable = (item) => {
    return true;
  };
  widget.helper_show = false;

  function setLevel(el, item, level, is_active) {
    const div = nDiv(el, "row");
    const last = level.length - 1;
    level.forEach((value, index) => {
      if (index) {
        const off = value + (index === last ? 0 : 2) - 1;
        if (
          widget.helper_enable(item) &&
          widget.set_helper &&
          is_active &&
          index === 1
        ) {
          nLink(
            nIcon(div, widget.helper_show ? "hier_edit" : "hier_prop"),
            "click",
            () => {
              /*widget.helper_show = !widget.helper_show; widget.changeValue( item, true );*/
            }
          );
        } else {
          nIcon(div, icon_list[off]);
        }
      }
    });

    return div;
  }

  let activeElem, currentElem;

  const getByClass = (el, cls) => {
    if (el) {
      if (el.classList.contains(cls)) return el;
      if (el.parentElement) return getByClass(el.parentElement, cls);
    }
    return;
  };

  widget.addEventListener("dragstart", (evt) => {
    activeElem = getByClass(evt.target, "draggable");
    evt.target.classList.add("selected");
  });

  widget.addEventListener("dragend", (evt) => {
    evt.target.classList.remove("selected");
    if (currentElem) {
      currentElem.classList.remove("active-border");
      if (currentElem !== activeElem) {
        widget.drag(activeElem.item, currentElem.item);
      }
    }
  });

  widget.addEventListener("dragover", (evt) => {
    evt.preventDefault();
    if (currentElem) {
      currentElem.classList.remove("active-border");
    }
    currentElem = getByClass(evt.target, "draggable");
    currentElem.classList.add("active-border");
  });

  function setHier(el, item, level = [2], top = true) {
    const is_active = item === widget.property.get();

    const body = nDiv(el, "column draggable");
    body.item = item;
    body.draggable = true;

    const holder = nDiv(body, "row panel");
    const levels = setLevel(holder, item, level, is_active);
    const list = widget.set_list(item);

    const count = list.length;
    if (count > 0) {
      if (item.is_open) {
        nLink(nIcon(holder, "hier_open" + (top ? "_top" : "")), "click", () => {
          item.is_open = false;
          widget.changeValue(item, true);
        });
      } else {
        nLink(
          nIcon(holder, "hier_close" + (top ? "_top" : "")),
          "click",
          () => {
            item.is_open = true;
            widget.changeValue(item, true);
          }
        );
      }
    } else {
      nIcon(holder, "hier_stub");
    }

    const header = nDiv(holder, "row panel");
    widget.set_header(header, item);

    nLink(holder, "click", () => {
      widget.changeValue(item);
      holder.focus();
    });

    if (is_active) {
      setClasses(holder, "active-background");
      //widget.scrollTop = header.offsetTop;
      //header.scrollIntoView();
      if (
        widget.helper_enable(item) &&
        widget.helper_show &&
        widget.set_helper
      ) {
        widget.set_helper(body, item);
      }
    }

    if (count && item.is_open) {
      const last = count - 1;
      list.forEach((child, index) => {
        setHier(body, child, level.concat([index === last ? 2 : 1]), false);
      });
    }
  }

  widget.updateView = () => {
    widget.do_clear();
    const container = nDiv(widget, "column");
    let root = widget.property.get();
    if (root) {
      while (root.parent) {
        root = root.parent;
        root.is_open = true;
      }
      setHier(container, root);
    }
  };

  widget.setValue = (value) => {
    widget.updateView();
  };

  return registryWidget(widget);
}
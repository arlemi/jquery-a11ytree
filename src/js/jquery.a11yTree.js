;(function ( $, window, document, undefined ) {
    var PLUGIN_NAME = 'a11yTree';
    var PLUGIN_PREFIX = 'plugin_';
    var LIST_SELECTOR = 'ul', LIST_ITEM_SELECTOR = 'li';
    var TABINDEX_ATTR_NAME = 'tabindex', TABINDEX_0 = '0';
    var KEYDOWN_EVENT = 'keydown', CLICK_EVENT = 'click';
    var ROLE_ATTR_NAME = 'role', ARIA_LEVEL_ATTR_NAME = 'aria-level';
    var ARIA_TREE_ROLE = 'tree', ARIA_TREEITEM_ROLE = 'treeitem', ARIA_GROUP_ROLE = 'group';
    var ARIA_SELECTED_ATTR = 'aria-selected', ARIA_EXPANDED_ATTR='aria-expanded';
    var HAS_CHILDREN_CLASS = 'at-has-children', HAS_CHILDREN_CLASS_SELECTOR = '.' + HAS_CHILDREN_CLASS;
    var NO_CHILDREN_CLASS = 'at-no-children';
    var TOGGLE_CLASS = 'at-toggle', TOGGLE_CLASS_SELECTOR = '.' + TOGGLE_CLASS;
    var DOWN_ARROW_KEY = 40, UP_ARROW_KEY = 38, RIGHT_ARROW_KEY = 39, LEFT_ARROW_KEY = 37, ENTER_KEY=13, END_KEY=35, HOME_KEY=36;

    defaults = {
        insertToggle : true,
        customToggle : {
            html : undefined
        },
        onExpand : function() {},
        onCollapse : function() {}
    };

    function Plugin( element, options ) {
        this.element = element;
        this.options = $.extend( {}, defaults, options);
        this._defaults = defaults;
        this.init();
    }

    Plugin.prototype = {
        init : function () {
            var $tree = $(this.element);
            this.identifyChildren($tree, ARIA_TREE_ROLE, 1);
            this.addToggle($tree);
            this.addMouseNav($tree);
            this.addKeyBoardNav($tree);
        },
        addToggle : function($tree) {
            var self = this;
            if (self.options.insertToggle === false) {
                return;
            }

            var toggleHtml = '';
            if (self.options.customToggle.html) {
                toggleHtml = self.options.customToggle.html;
            }

            $tree.find(HAS_CHILDREN_CLASS_SELECTOR).prepend('<div class="' + TOGGLE_CLASS  + '" aria-hidden="true">' + toggleHtml + '</div>');
            $tree.find(TOGGLE_CLASS_SELECTOR).on(CLICK_EVENT, function(event) {
                var $listItemWithToggle = $(this).parent(LIST_ITEM_SELECTOR);
                self.toggleExpandCollapse($listItemWithToggle);

            });
        },
        addMouseNav : function($tree) {
            var self = this;
            $tree.find('li').click(function(event) {
                event.stopPropagation();
                self.focusOn($(this), $tree);
                //return false;
            });
        },
        addKeyBoardNav : function($tree) {
            $tree.find(' > li:nth-child(1)').attr(ARIA_SELECTED_ATTR,'true');
            this.addTreeToTabOrder($tree);
            this.handleKeys($tree);
        },
        isKey : function(event, key) {
            return event.which === key;
        },
        handleKeys : function($tree) {
            var self = this;
            $tree.on(KEYDOWN_EVENT, function(event) {
                var $currentFocusedElement = $tree.find('[aria-selected="true"]');
                if (self.isKey(event, DOWN_ARROW_KEY)) {
                    event.preventDefault();
                    self.handleDownArrowKey($currentFocusedElement, $tree);
                } else if (self.isKey(event, UP_ARROW_KEY)) {
                    event.preventDefault();
                    self.handleUpArrowKey($currentFocusedElement, $tree);
                } else if (self.isKey(event, RIGHT_ARROW_KEY)) {
                    event.preventDefault();
                    self.handleRightArrowKey($currentFocusedElement, $tree);
                } else if (self.isKey(event, LEFT_ARROW_KEY)) {
                    event.preventDefault();
                    self.handleLeftArrowKey($currentFocusedElement, $tree);
                } else if (self.isKey(event, ENTER_KEY)) {
                    self.handleEnterKey($currentFocusedElement, $tree);
                } else if (self.isKey(event, END_KEY)) {
                    event.preventDefault();
                    self.handleEndKey($currentFocusedElement, $tree);
                } else if (self.isKey(event, HOME_KEY)) {
                    event.preventDefault();
                    self.handleHomeKey($currentFocusedElement, $tree);
                }
            });
        },
        addTreeToTabOrder : function($tree) {
            $tree.attr(TABINDEX_ATTR_NAME, TABINDEX_0);
        },
        handleLeftArrowKey : function($item, $tree) {
            if (this.isExpanded($item)) {
                this.collapse($item);
            } else {
                this.focusOn(this.findParent($item), $tree);
            }
        },
        handleRightArrowKey : function($item, $tree) {
            if (this.isCollapsed($item)) {
                this.expand($item);
            } else if (this.isExpanded($item)) {
                this.focusOn(this.findFirstListItemInSubList($item), $tree);
            }
        },
        handleUpArrowKey : function($item, $tree) {
            if (this.isExpanded($item.prev())) {
                var $previousSiblingList = $item.prev().children(LIST_SELECTOR);
                this.focusOn(this.findLastListItem($previousSiblingList).focus(), $tree);
            } else if ($item.prev().length === 0) {
                this.focusOn(this.findParent($item), $tree);
            } else {
                this.focusOn($item.prev(), $tree);
            }
        },
        handleDownArrowKey : function($item, $tree) {
            if (this.hasChildren($item) && this.isExpanded($item)) {
                this.focusOn(this.findFirstListItemInSubList($item), $tree);
            } else if ($item.next().length === 0) {
                this.focusOn(this.findParent($item).next(), $tree);
            } else {
                this.focusOn($item.next(), $tree);
            }
        },
        handleEnterKey : function($item, $tree) {
            this.toggleExpandCollapse($item);
        },
        handleEndKey : function($item, $tree) {
            var $lastListItemInTree = $tree.find(LIST_ITEM_SELECTOR).last();
            var $listWithLastListItemInTree = $lastListItemInTree.parent(LIST_SELECTOR);
            if (!this.isParentTree($listWithLastListItemInTree)) {
                var $closestExpandedListItem = $lastListItemInTree.closest('li[aria-expanded="true"]');
                if ($closestExpandedListItem.length === 0) {
                    $listWithLastListItemInTree = $tree;
                } else {
                    $listWithLastListItemInTree = $closestExpandedListItem.children(LIST_SELECTOR);
                }
            }
            this.focusOn(this.findLastListItem($listWithLastListItemInTree), $tree);
        },
        handleHomeKey : function($item, $tree) {
            this.focusOn(this.findFirstListItem($tree), $tree);
        },
        hasChildren : function($item) {
            return $item.hasClass(HAS_CHILDREN_CLASS);
        },
        focusOn : function($item, $tree) {
            if ($item.length === 1) {
                $tree.find('li').attr(ARIA_SELECTED_ATTR,'false');
                $item.attr(ARIA_SELECTED_ATTR,'true');
            }
        },
        expand : function($item) {
            if (this.options.onExpand) {
                this.options.onExpand($item);
            }
            $item.attr(ARIA_EXPANDED_ATTR,'true');
        },
        collapse : function($item) {
            if (this.options.onCollapse) {
                this.options.onCollapse($item);
            }
            $item.attr(ARIA_EXPANDED_ATTR,'false');
        },
        isExpanded : function($item) {
            return $item.attr(ARIA_EXPANDED_ATTR) === 'true';
        },
        isCollapsed : function($item) {
            return $item.attr(ARIA_EXPANDED_ATTR) === 'false';
        },
        toggleExpandCollapse : function($item) {
            if (this.isCollapsed($item)) {
                this.expand($item);
            } else {
                this.collapse($item);
            }
        },
        isParentTree : function($list) {
            return $list.attr(ROLE_ATTR_NAME) === ARIA_TREE_ROLE;
        },
        findParent : function($item) {
            return $item.parent(LIST_SELECTOR).parent(LIST_ITEM_SELECTOR);
        },
        findLastListItem : function($list) {
            return $list.find(' > li:last-child');
        },
        findFirstListItem : function($list) {
            return $list.find(' > li:first-child');
        },
        findFirstListItemInSubList : function($item) {
            return $item.children(LIST_SELECTOR).find(' > li:nth-child(1)');
        },
        identifyListItemWithChildren : function($listItem) {
            this.collapse($listItem);
            $listItem.addClass(HAS_CHILDREN_CLASS);
        },
        identifySubChildren : function($listItem, nestingLevel) {
            var $childList = $listItem.children(LIST_SELECTOR);
            if ($childList.length > 0) {
                this.identifyListItemWithChildren($listItem);
                this.identifyChildren($childList, ARIA_GROUP_ROLE, nestingLevel + 1);
            } else {
                $listItem.addClass(NO_CHILDREN_CLASS);
            }
        },
        identifyChildren : function($list, listRole, nestingLevel) {
            var self = this;
            $list.attr(ROLE_ATTR_NAME, listRole);
            var $listItems = $list.children(LIST_ITEM_SELECTOR);
            $listItems.attr(ROLE_ATTR_NAME,ARIA_TREEITEM_ROLE).attr(ARIA_LEVEL_ATTR_NAME,nestingLevel);
            $listItems.each(function() {
                self.identifySubChildren($(this), nestingLevel);
            });
        }
    };

    $.fn[PLUGIN_NAME] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, PLUGIN_PREFIX + PLUGIN_NAME)) {
                $.data(this, PLUGIN_PREFIX + PLUGIN_NAME,
                    new Plugin( this, options ));
            }
        });
    };

})( jQuery, window, document );
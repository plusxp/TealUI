/**
 * @fileOverview 实现拖动功能。
 * @author xuld
 */

// #require ../dom/base#角色,位置,事件

/**
 * 表示一个可拖动元素。
 * @param {Element} elem 要拖动的元素。
 * @param {Object} options 用户覆盖可拖动对象的配置。
 */
function Draggable(elem, options) {

    var me = this, key;

    me.dom = Dom(elem);

    // 使用用户自定义配置覆盖默认配置。
    for (key in options) me[key] = options[key];

    me.handle = me.handle ? Dom(me.handle) : me.dom[0];
    me.proxy = me.proxy ? Dom(me.proxy) : me.dom[0];

    me.handle.on('mousedown', me.handlerMouseDown, me);

}

Draggable.prototype = {

    constructor: Draggable,

    /**
     * 当前拖动的节点。
     * @type {Dom}
     */
    dom: null,

    /**
     * 拖动的手柄。只有从手柄点击才能开始拖动。
     * @type {Dom}
     */
    dom: null,

    /**
     * 从鼠标按下到开始拖动的延时。
     * @type {Number}
     */
    dragblay: 500,

    /**
     * 处理拖动开始事件。
     * @param {Event} e 原生的 mousemove 事件。
     */
    dragStart: function (e) {
        var me = this;
        me.startOffset = me.dom[0].getOffset();
        return !me.onDragStart || me.onDragStart(e);
    },

    /**
     * 处理拖动中事件。
     * @param {Event} e 原生的 mousemove 事件。
     */
    dragMove: function (e) {

        var me = this;

        if (me.startOffset) {

            // 更新目标偏移量。
            me.endOffset = {
                left: me.startOffset.left + me.endX - me.startX,
                top: me.startOffset.top + me.endY - me.startY
            };

            // 调用用户的拖动回调并更新位置。
            if (!me.onDragMove || me.onDragMove(e) !== false) {
                me.dom[0].style.top = me.endOffset.top + 'px';
                me.dom[0].style.left = me.endOffset.left + 'px';
            }

        }
    },

    /**
     * 处理拖动结束事件。
     * @param {Event} e 原生的 mousemove 事件。
     */
    dragEnd: function (e) {
        var me = this;
        me.onDragEnd && me.onDragEnd(e);
        me.startOffset = me.endOffset = null;
    },

    /**
     * 处理 mousedown 事件。
     * 初始化拖动，当单击时，执行这个函数，但不触发 dragStart。
     * 只有鼠标移动时才会继续触发 dragStart。
     * @param {Event} e 事件参数。
     */
    handlerMouseDown: function (e) {

        // 只处理左键拖动。
        if (e.which === 1) {

            var me = this;

            // 阻止默认事件。
            e.preventDefault();

            // 如果当前正在拖动，通知当前拖动对象停止拖动。
            if (Draggable.current) Draggable.current.stopDragging(e);

            // 记录当前的开始位置。
            me.endX = me.startX = e.pageX;
            me.endY = me.startY = e.pageY;

            // 设置下一步处理句柄。
            me.currentHandler = me.startDragging;

            // 当用户仅按住鼠标指定时间，也认为开始拖动。
            me.timer = setTimeout(function () {
                me.timer = 0;
                me.currentHandler(e);
            }, me.dragDelay);

            // 绑定拖动和停止拖动事件。
            var doc = me.dom[0].ownerDocument;
            doc.on('mouseup', me.handlerMouseUp, me);
            doc.on('mousemove', me.handlerMouseMove, me);

        }

    },

    /**
     * 处理 mousemove 事件。
     * @param {Event} e 事件参数。
     */
    handlerMouseMove: function (e) {

        // 阻止默认事件。
        e.preventDefault();

        var me = this;

        // 更新当前的鼠标位置。
        me.endX = e.pageX;
        me.endY = e.pageY;

        // 调用当前的处理句柄来处理此函数。
        me.currentHandler(e);
    },

    /**
     * 处理 mouseup 事件。
     * @param {Event} e 事件参数。
     * 这个函数调用 onDragEnd 和 afterDrag
     */
    handlerMouseUp: function (e) {
        // 只有鼠标左键松开， 才认为是停止拖动。
        if (e.which === 1) {
            e.preventDefault();
            this.stopDragging(e);
        }
    },

    /**
     * 处理 mousedown 或 mousemove 事件，开始准备拖动。
     * @param {Event} e 事件。
     */
    startDragging: function (e) {

        var me = this;

        // 设置当前正在拖动的对象。
        Draggable.current = me;

        // 清空计时器。
        if (me.timer) {
            clearTimeout(me.timer);
            me.timer = 0;
        }

        // 设置下次处理拖动的处理函数。
        me.currentHandler = me.dragMove;

        // 锁定鼠标样式。
        me.orignalCursor = document.documentElement.style.cursor;
        document.documentElement.style.cursor = me.dom[0].getStyle('cursor');
        if ('pointerEvents' in document.body.style)
            document.body.style.pointerEvents = 'none';
        else if (document.body.setCapture)
            document.body.setCapture();

        // 执行开始拖动回调，如果用户阻止和强制停止拖动。
        if (me.dragStart(e) !== false) {
            me.dragMove(e, true);
        } else {
            me.stopDragging(e);
        }
    },

    /**
     * 强制停止当前对象的拖动。
     * @param {Event} e 事件。
     */
    stopDragging: function (e) {

        var me = this,
            doc = me.dom[0].ownerDocument;
        doc.off('mousemove', me.handlerMouseMove);
        doc.off('mouseup', me.handlerMouseUp);

        //   清空计时器。
        if (me.timer) {
            clearTimeout(me.timer);
            me.timer = 0;
            // 触发原目标的 click 事件。
            if (me.endX === me.startX && me.endY === me.startY) {
                me.dom[0].click();
            }
        }

        // 拖动结束。
        if (Draggable.current) {

            // 恢复鼠标样式。
            if (document.body.style.pointerEvents === 'none')
                document.body.style.pointerEvents = '';
            else if (document.body.releaseCapture)
                document.body.releaseCapture();
            document.documentElement.style.cursor = me.orignalCursor;

            me.dragEnd(e);
            Draggable.current = null;

        }

    },

    /**
     * 销毁拖动对象。
     */
    destroy: function () {
        this.handle.off('mousedown', this.handlerMouseDown);
    }

};

/**
 * 初始化指定的元素为可拖动对象。
 * @param {Object} options 拖动的相关属性。
 * 
 * - handle: 拖动的句柄元素。
 * - dragDelay: 从鼠标按下到开始拖动的延时。
 * - onDragStart/onDragMove/onDragEnd: 设置拖动开始/移动/结束时的回调。
 */
Dom.prototype.draggable = function (options) {
    return this.initAs('draggable', Draggable, options);
};

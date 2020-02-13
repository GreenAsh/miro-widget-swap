const swap_icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 168v-16c0-13.255 10.745-24 24-24h360V80c0-21.367 25.899-32.042 40.971-16.971l80 80c9.372 9.373 9.372 24.569 0 33.941l-80 80C409.956 271.982 384 261.456 384 240v-48H24c-13.255 0-24-10.745-24-24zm488 152H128v-48c0-21.314-25.862-32.08-40.971-16.971l-80 80c-9.372 9.373-9.372 24.569 0 33.941l80 80C102.057 463.997 128 453.437 128 432v-48h360c13.255 0 24-10.745 24-24v-16c0-13.255-10.745-24-24-24z"/></svg>`;


const EMPTY_STATE = {
    swapStarted: false,
    widget: false,
    unlockId: false
}
window.state = {
    swapStarted: false,
    widget: false,
    unlockId: false
}

miro.onReady(async () => {
    const authorized = await miro.isAuthorized();
    if (!authorized) {
        return;
    }

    await miro.initialize({
      
        extensionPoints: {
            getWidgetMenuItems: async (widgets) => {
                if (!widgets || widgets.length !== 1) {
                    return [];
                }
                const widget = widgets[0];
                return [{
                    tooltip: 'Swap',
                    svgIcon: swap_icon,
                    onClick: async (widgets) => {
                        if (window.state.swapStarted === false) {
                            window.state = await startSwap(widget);
                            console.log('menuClick', window.state)
                            await miro.board.selection.clear();
                        } else if (widget.id !== window.state.widget.id) {
                            swapWith([widget.id], widget.bounds);
                        }
                    }
                }]
            }
        }
    })
    
    miro.addListener('SELECTION_UPDATED', async (e) => {
        console.log('SELECTION_UPDATED', window.state)
        console.log(e.data)
        if (window.state.swapStarted === false) {
            return;
        }
        
        const widgets = e.data;
        if (!widgets || widgets.length === 0) {
            return;
        }
        
        for (let i = 0; i < widgets.length; i++) {
            if (widgets[i].id === window.state.widget.id) {
                console.log("Can't swap with starting widget")
                return;
            }
        }
        
        const bounds = await miro.board.figma.getWidgetsBounds(widgets);
        const targetBounds = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, width: bounds.width, height: bounds.height };
        await swapWith(widgets.map(({id}) => id), bounds);
    })
});

async function swapWith(widgetIds, targetBounds){
    const state = window.state
    const sourceBounds = state.widget.bounds;
    
    const dx = sourceBounds.x - targetBounds.x;
    const dy = sourceBounds.y - targetBounds.y;
    
    console.log(widgetIds)
    console.log(dx, dy, sourceBounds, targetBounds);
    
    await miro.board.widgets.transformDelta(state.widget.id, -dx, -dy);
    await miro.board.widgets.transformDelta(widgetIds, dx, dy);
    stopSwap(state)
}

async function startSwap(widget){
    await miro.board.widgets.update({"id": widget.id, capabilities: {editable: false}})
    const timeoutId = setTimeout(async () => {
        await stopSwap(window.state) 
    }, 20000);
    await miro.board.ui.__hideButtonsPanels('all');
    return {
        swapStarted: true,
        widget: widget,
        unlockId: timeoutId
    };
}

async function stopSwap(state) {
    if (state.swapStarted === false){
        return;
    }
    if (state.widget && state.widget.capabilities && state.widget.capabilities.editable === false) {
        await miro.board.widgets.update({"id": state.widget.id, capabilities: {editable: true}})
    }
    clearInterval(state.unlockId);
    window.state = EMPTY_STATE;
    await miro.board.ui.__showButtonsPanels('all');
}

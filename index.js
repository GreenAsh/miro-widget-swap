const swap_icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 168v-16c0-13.255 10.745-24 24-24h360V80c0-21.367 25.899-32.042 40.971-16.971l80 80c9.372 9.373 9.372 24.569 0 33.941l-80 80C409.956 271.982 384 261.456 384 240v-48H24c-13.255 0-24-10.745-24-24zm488 152H128v-48c0-21.314-25.862-32.08-40.971-16.971l-80 80c-9.372 9.373-9.372 24.569 0 33.941l80 80C102.057 463.997 128 453.437 128 432v-48h360c13.255 0 24-10.745 24-24v-16c0-13.255-10.745-24-24-24z"/></svg>`;


const EMPTY_STATE = {
    swapStarted: false,
    widgets: false,
    unlockId: false
}
window.state = {
    swapStarted: false,
    widgets: false,
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
                if (!widgets || widgets.length === 0) {
                    return [];
                }
                return [{
                    tooltip: 'Swap',
                    svgIcon: swap_icon,
                    onClick: async (w) => {
                        if (window.state.swapStarted === false) {
                            window.state = await startSwap(widgets);
                            await miro.board.selection.clear();
                        }
                    }
                }]
            }
        }
    });
    
    miro.addListener('SELECTION_UPDATED', async (e) => {
        if (window.state.swapStarted === false) {
            return;
        }

        const widgets = e.data;
        if (!widgets || widgets.length === 0) {
            return;
        }

        // const bounds = await miro.board.figma.getWidgetsBounds(widgets);
        // const targetBounds = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, width: bounds.width, height: bounds.height };
        await swapWith(widgets); //, targetBounds
    })
    
    
});

async function swapWith(widgets) {
    const state = window.state
    for (let i = 0; i < widgets.length; i++) {
        for (let j = 0; j < state.widgets.length; j++) {
            if (widgets[i].id === state.widgets[j].id) {
                miro.showErrorNotification("Widgets intersection")
                return;
            }
        }
    }
    const sourceBounds = await miro.board.figma.getWidgetsBounds(state.widgets);
    const targetBounds = await miro.board.figma.getWidgetsBounds(widgets);
    
    const dx = sourceBounds.x - targetBounds.x;
    const dy = sourceBounds.y - targetBounds.y;
    
    await miro.board.widgets.transformDelta(state.widgets.map((val) => { return { id: val.id} }), -dx, -dy);
    await miro.board.widgets.transformDelta(widgets.map((val) => { return { id: val.id} }), dx, dy);
    stopSwap(state)
}

async function startSwap(widgets){
    //     await miro.board.widgets.update(
    //         widgets.map((widget) => { 
    //             return {"id": widget.id, capabilities: {editable: false}} 
    //         })
    //     )
    const timeoutId = setTimeout(async () => {
        await stopSwap(window.state) 
    }, 60000);
    await miro.board.ui.__hideButtonsPanels('all');
    return {
        swapStarted: true,
        widgets: widgets,
        unlockId: timeoutId
    };
}

async function stopSwap(state) {
    if (state.swapStarted === false){
        return;
    }
    //     if (state.widgets) {
    //         await miro.board.widgets.update(
    //             state.widgets.map((val) => {
    //                 return {"id": state.widget.id, capabilities: {editable: true}} 
    //             } )
    //         )
    //     }
    clearInterval(state.unlockId);
    window.state = EMPTY_STATE;
    await miro.board.ui.__showButtonsPanels('all');
}

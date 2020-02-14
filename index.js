const swap_icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.2073 1.29289C18.8167 0.902369 18.1836 0.902369 17.793 1.29289C17.4025 1.68342 17.4025 2.31658 17.793 2.70711L20.0859 5H1.58609C1.0338 5 0.586088 5.44772 0.586088 6C0.586088 6.55228 1.0338 7 1.58609 7H20.0859L17.793 9.29289C17.4025 9.68342 17.4025 10.3166 17.793 10.7071C18.1836 11.0976 18.8167 11.0976 19.2073 10.7071L23.9144 6L19.2073 1.29289Z" fill="#050038"/>
<path d="M5.29304 22.7071C5.68357 23.0976 6.31673 23.0976 6.70726 22.7071C7.09778 22.3166 7.09778 21.6834 6.70726 21.2929L4.41436 19H23.0006C23.5529 19 24.0006 18.5523 24.0006 18C24.0006 17.4477 23.5529 17 23.0006 17H4.41436L6.70726 14.7071C7.09778 14.3166 7.09778 13.6834 6.70726 13.2929C6.31673 12.9024 5.68357 12.9024 5.29305 13.2929L0.585938 18L5.29304 22.7071Z" fill="#050038"/></svg>`;


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
    
    await miro.board.widgets.update(state.widgets.map((val) => { return { id: val.id, clientVisible: false } }))
    await miro.board.widgets.transformDelta(state.widgets, -dx, -dy);
    await miro.board.widgets.transformDelta(widgets, dx, dy);
    await miro.board.widgets.update(state.widgets.map((val) => { return { id: val.id, clientVisible: true } }))
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
    // await miro.board.ui.__hideButtonsPanels('all');
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
    // await miro.board.ui.__showButtonsPanels('all');
}

// ==UserScript==
// @name         SBG Uniques
// @namespace    https://3d.sytes.net/
// @version      1.0.4
// @downloadURL  https://x27.github.io/sbg-uniques/index.js
// @updateURL    https://x27.github.io/sbg-uniques/index.js
// @description  Uniques for SBG
// @author       x27
// @match        https://3d.sytes.net
// @match        https://3d.sytes.net/*
// @grant        none
// ==/UserScript==

window.addEventListener('load', () => setTimeout(main, 1000), false);

async function main() {
    'use strict';

    const UNIQUE_COLOR= 'magenta';
    let unique_uuids = [];

    const TeamColors = [
        { fill: () => is_dark ? '#AAAAAA80' : '#44444480', stroke: () => is_dark ? '#AAA' : '#444' },
        { fill: '#BB000080', stroke: '#B00' },
        { fill: '#00BB0080', stroke: '#0B0' },
        { fill: '#0088FF80', stroke: '#08F' }
    ]

    function calculateAngle(percent, offset = 0) {
        const full = 2 * Math.PI
        return [
            full * offset - Math.PI / 2,
            full * offset + full * percent - Math.PI / 2
        ]
    }

    let is_dark = JSON.parse(localStorage.getItem('settings')).theme == 'auto'
        ? matchMedia('(prefers-color-scheme: dark)').matches
        : JSON.parse(localStorage.getItem('settings')).theme == 'dark'


    const TeamUniqueFeatureStyle = (pos, team, energy) => new ol.style.Style({
        geometry: new ol.geom.Circle(pos, 12),
        renderer: (coords, state) => {
            const ctx = state.context
            const [[xc, yc], [xe, ye]] = coords
            const radius = Math.sqrt((xe - xc) ** 2 + (ye - yc) ** 2)

            ctx.lineWidth = 2
            ctx.strokeStyle = TeamColors[team].stroke
            ctx.fillStyle = TeamColors[team].fill
            ctx.beginPath()
            ctx.arc(xc, yc, radius, ...calculateAngle(1 - energy, energy))
            ctx.lineTo(xc, yc)
            ctx.fill()

            ctx.fillStyle = TeamColors[team].fill
            ctx.strokeStyle = UNIQUE_COLOR
            ctx.beginPath()
            ctx.arc(xc, yc, radius, ...calculateAngle(energy))
            ctx.lineTo(xc, yc)
            ctx.fill()
            ctx.beginPath()
            ctx.arc(xc, yc, radius, 0, 2 * Math.PI)
            ctx.stroke()
        }
    });

    const { fetch: originalFetch } = window;

    window.fetch = async (...args) => {
        let [resource, config ] = args;
        if (resource.match(/\/api\/inview/)) 
            resource = resource.concat('&unique=c');

        const response = await originalFetch(resource, config);
        if (response.url.match(/\/api\/inview/)) {
            try {
                unique_uuids = (await response.clone().json()).data.points.filter(p => p.u).map(p => p.g);
            } catch (error) {
                console.log('Parse server response error.', error);
            }
        }
        return response;        
    };

    ol.source.Vector.prototype.addFeature = function(t) {
        if (t.getGeometry().getType() == 'Point') {
            if (unique_uuids.indexOf(t.getId()) == -1) {
                if (t.getProperties()["team"] == 0) {
                    t.getStyle()[0].getStroke().setColor(UNIQUE_COLOR);
                }
                else {
                    t.setStyle(TeamUniqueFeatureStyle(t.getGeometry().getCoordinates(), t.getProperties()["team"], t.getProperties()["energy"]));
                }
            }
        }
        this.addFeatureInternal(t);
        this.changed();
    }
}
import { AtlasParser } from './atlasParser'
import { AssetsParser, QueriedBlock } from './parser'
import { getLoadedBlockstatesStore, getLoadedModelsStore } from './stores'

export default function worldBlockProvider(blockstatesModels: any, blocksAtlas: any, version: string) {
    const blockStatesStore = getLoadedBlockstatesStore(blockstatesModels)
    const blockModelsStore = getLoadedModelsStore(blockstatesModels)

    const assetsParser = new AssetsParser(version, blockStatesStore, blockModelsStore)
    const atlasParser = new AtlasParser(blocksAtlas, 'latest', 'legacy')
    return {
        getResolvedModel0_1(block: Omit<QueriedBlock, 'stateId'>, fallbackVariant = false) {
            const model = assetsParser.getResolvedModel(block, fallbackVariant)

            const interestedFaces = ['north', 'east', 'south', 'west', 'up', 'down']

            return {
                // todo validate elements
                elements: model.elements?.map((elem) => {
                    return {
                        from: elem.from,
                        to: elem.to,
                        faces: Object.fromEntries(Object.entries(elem.faces).map(([faceName, face]) => {
                            const texture = model.textures![face.texture.replace('#', '')];
                            // TODO validate at the validation stage
                            if (!texture) throw new Error(`Missing resolved texture ${texture} for face ${faceName} of ${block.name}`)
                            const finalTexture = this.getTextureInfo(texture)
                            if (!finalTexture) throw new Error(`Missing texture data ${texture} for ${block.name}`)

                            const _from = elem.from
                            const _to = elem.to
                            // taken from https://github.com/DragonDev1906/Minecraft-Overviewer/
                            const COORDINATE_MAX = 16
                            const uv = (face.uv || {
                                // default UVs
                                // format: [u1, v1, u2, v2] (u = x, v = y)
                                north: [_to[0], COORDINATE_MAX - _to[1], _from[0], COORDINATE_MAX - _from[1]],
                                east: [_from[2], COORDINATE_MAX - _to[1], _to[2], COORDINATE_MAX - _from[1]],
                                south: [_from[0], COORDINATE_MAX - _to[1], _to[0], COORDINATE_MAX - _from[1]],
                                west: [_from[2], COORDINATE_MAX - _to[1], _to[2], COORDINATE_MAX - _from[1]],
                                up: [_from[0], _from[2], _to[0], _to[2]],
                                down: [_to[0], _from[2], _from[0], _to[2]]
                            }[faceName]!) as [number, number, number, number]

                            const su = (uv[2] - uv[0]) / COORDINATE_MAX * finalTexture.su
                            const sv = (uv[3] - uv[1]) / COORDINATE_MAX * finalTexture.sv

                            return [faceName, {
                                texture: {
                                    ...finalTexture,
                                    u: finalTexture.u + uv[0] / 16 * finalTexture.su,
                                    v: finalTexture.v + uv[1] / 16 * finalTexture.sv,
                                    su,
                                    sv
                                },
                                cullface: face.cullface
                            }]
                        }))
                    }
                }),
                ao: model.ao,
                x: model.x,
                y: model.y,
                z: model.z,
            }
        },
        getTextureInfo(textureName: string) {
            return atlasParser.getTextureInfo(version, textureName.replace('block/', ''))
        }
    }
}

export type WorldBlockProvider = ReturnType<typeof worldBlockProvider>
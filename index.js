import minecraft_data from 'minecraft-data';
import keys from '/home/opc/minecraft-inventory/utilities/keys.js';
import * as utils from '/home/opc/minecraft-inventory/utilities/utils.js';
import fs from 'fs';
import path from 'path';
import Canvas from 'skia-canvas';

// IMPORTANT: This imports have absolute paths, make sure to moddify it in case you want to use this code

const mcData = minecraft_data('1.20.1');

const armorSlotCoords = {
    5: [16, 16],
    6: [16, 52],
    7: [16, 88],
    8: [16, 124],
    45: [154, 124],
};
const mainInvSlotCoords = {
    9: [16, 168],
    10: [52, 168],
    11: [88, 168],
    12: [124, 168],
    13: [160, 168],
    14: [196, 168],
    15: [232, 168],
    16: [268, 168],
    17: [304, 168],
    18: [16, 204],
    19: [52, 204],
    20: [88, 204],
    21: [124, 204],
    22: [160, 204],
    23: [196, 204],
    24: [232, 204],
    25: [268, 204],
    26: [304, 204],
    27: [16, 240],
    28: [52, 240],
    29: [88, 240],
    30: [124, 240],
    31: [160, 240],
    32: [196, 240],
    33: [232, 240],
    34: [268, 240],
    35: [304, 240],
};
const hotbarSlotCoords = {
    36: [16, 284],
    37: [52, 284],
    38: [88, 284],
    39: [124, 284],
    40: [160, 284],
    41: [196, 284],
    42: [232, 284],
    43: [268, 284],
    44: [304, 284],
};

//Construct shulkerSlotCoords from player inventory
const shulkerSlotCoords = Object.assign(
    //Move mainInvSlotCoords up by 132 and decrease slot number by 9
    Object.fromEntries(Object.entries(mainInvSlotCoords)
        .map(([slot, [x, y]]) => [slot - 9, [x, y - 132]])),
    //Increase slot numbers by 18
    Object.fromEntries(Object.entries(Object.assign({}, mainInvSlotCoords, hotbarSlotCoords))
        .map(([slot, [x, y]]) => [+slot + 18, [x, y]])),
);

const armorSlotNames = {
    5: keys.commands.inventory.slots.head,
    6: keys.commands.inventory.slots.chest,
    7: keys.commands.inventory.slots.legs,
    8: keys.commands.inventory.slots.feet,
    45: keys.commands.inventory.slots.offhand,
};

export default class Inventory {

    constructor() {
        this.name = 'inventory';
        this.requiresUserIndex = 0;
        this.category = 'main';
    }

    async execute(file, server) {
        const user = file.user; // Adjusted to retrieve user info from the file object
        const showDetails = false; // Always set to false
    
        // Get the .dat file from the new path
        const playerDataPath = `/home/opc/html/wp-content/uploads/playerdata/${user.uuid}.dat`;
        if (typeof utils.readDatFromFile !== 'function') {
            console.error('utils.readDatFromFile is not a function');
            return;
        }
    
        // Read the .dat file
        const playerData = await utils.readDatFromFile(playerDataPath);
        if (!playerData) return;
        console.log('Player Data:', playerData); // Log the player data
        // Convert slots to network slots
        playerData.Inventory = playerData.Inventory.map(item => ({
            ...item,
            Slot: this.dataSlotToNetworkSlot(item.Slot),
        }));

        // Renderizar el contenedor del inventario
        const { canvas: invCanvas, ctx } = await renderContainer(
            './resources/images/containers/inventory_blank.png',
            playerData.Inventory,
            Object.assign({}, mainInvSlotCoords, armorSlotCoords, hotbarSlotCoords),
            user.username, // Updated to use the username
            showDetails ? this.pushInvButton.bind(null, itemButtons, Infinity) : () => {},
        );

        async function getSkin(uuidOrUsername) {
            const skinJson = await fetch(`https://minecraft-api.com/api/skins/${uuidOrUsername}/body/10.5/10/json`);
            const { skin } = await skinJson.json();
            const image = await Canvas.loadImage(`data:image/png;base64, ${skin}`);
            //check dimensions of skinImg
            if(image.width !== 195 || image.height !== 393) return await getSkin('MHF_Steve');
            return image;
        }

        const skinImg = await getSkin(server.online ? user.uuid : user.username);
        ctx.drawImage(skinImg, 70, 20, 65, 131);
    }


    addInfo(embed, tag, itemStats) {
        let addedInfo = false;

        //Add durability info
        if(tag?.Damage && itemStats?.maxDurability) {
            embed.addFields(addPh(
                keys.commands.inventory.success.item_durability.embeds[0].fields,
                {
                    durability: itemStats.maxDurability - tag.Damage,
                    max_durability: itemStats.maxDurability,
                },
            ));

            addedInfo = true;
        }

        //Add lore info
        if(tag?.display?.Lore) {
            embed.addFields(addPh(
                keys.commands.inventory.success.item_lore.embeds[0].fields,
                {
                    lore_json: tag.display.Lore,
                    lore: JSON.parse(tag.display.Lore).text ?? tag.display.Lore.replace(/"/g, ''),
                },
            ));

            addedInfo = true;
        }

        //Add custom name info
        if(tag?.display?.Name) {
            embed.addFields(addPh(
                keys.commands.inventory.success.item_custom_name.embeds[0].fields,
                {
                    custom_name_json: tag.display.Name,
                    custom_name: JSON.parse(tag.display.Name).text ?? tag.display.Name.replace(/"/g, ''),
                },
            ));

            addedInfo = true;
        }

        //Add enchantments info
        if(tag?.Enchantments || tag?.StoredEnchantments) {
            const allEnchantments = tag?.Enchantments ?? tag.StoredEnchantments;
            const formattedEnchantments = allEnchantments.map(ench => {
                return `- ${mcData.enchantmentsByName[ench.id.split(':').pop()]?.displayName ?? ench.id} ${this.romanNumber(ench.lvl)}`;
            }).join('\n');

            embed.addFields(addPh(
                keys.commands.inventory.success.item_enchantments.embeds[0].fields,
                { enchantments: formattedEnchantments },
            ));

            addedInfo = true;
        }

        if(tag?.Potion) {
            const effectByPotionName = {
                'fire_resistance': `- ${mcData.effectsByName['FireResistance'].displayName} (3:00)`,
                'long_fire_resistance': `- ${mcData.effectsByName['FireResistance'].displayName} (8:00)`,
                'healing': `- ${mcData.effectsByName['InstantHealth'].displayName}`,
                'strong_healing': `- ${mcData.effectsByName['InstantHealth'].displayName} II`,
                'slow_falling': `- ${mcData.effectsByName['SlowFalling'].displayName} (1:30)`,
                'long_slow_falling': `- ${mcData.effectsByName['SlowFalling'].displayName} (4:00)`,
                'night_vision': `- ${mcData.effectsByName['NightVision'].displayName} (3:00)`,
                'long_night_vision': `- ${mcData.effectsByName['NightVision'].displayName} (8:00)`,
                'regeneration': `- ${mcData.effectsByName['Regeneration'].displayName} (0:45)`,
                'long_regeneration': `- ${mcData.effectsByName['Regeneration'].displayName} (1:30)`,
                'strong_regeneration': `- ${mcData.effectsByName['Regeneration'].displayName} II (0:22)`,
                'swiftness': `- ${mcData.effectsByName['Speed'].displayName} (3:00)`,
                'long_swiftness': `- ${mcData.effectsByName['Speed'].displayName} (8:00)`,
                'strong_swiftness': `- ${mcData.effectsByName['Speed'].displayName} II (1:30)`,
                'leaping': `- ${mcData.effectsByName['JumpBoost'].displayName} (3:00)`,
                'long_leaping': `- ${mcData.effectsByName['JumpBoost'].displayName} (8:00)`,
                'strong_leaping': `- ${mcData.effectsByName['JumpBoost'].displayName} II (1:30)`,
                'strength': `- ${mcData.effectsByName['Strength'].displayName} (3:00)`,
                'long_strength': `- ${mcData.effectsByName['Strength'].displayName} (8:00)`,
                'strong_strength': `- ${mcData.effectsByName['Strength'].displayName} II (1:30)`,
                'invisibility': `- ${mcData.effectsByName['Invisibility'].displayName} (3:00)`,
                'long_invisibility': `- ${mcData.effectsByName['Invisibility'].displayName} (8:00)`,
                'water_breathing': `- ${mcData.effectsByName['WaterBreathing'].displayName} (3:00)`,
                'long_water_breathing': `- ${mcData.effectsByName['WaterBreathing'].displayName} (8:00)`,
                'slowness': `- ${mcData.effectsByName['Slowness'].displayName} (3:00)`,
                'long_slowness': `- ${mcData.effectsByName['Slowness'].displayName} (4:00)`,
                'strong_slowness': `- ${mcData.effectsByName['Slowness'].displayName} IV (0:20)`,
                'harming': `- ${mcData.effectsByName['InstantDamage'].displayName}`,
                'strong_harming': `- ${mcData.effectsByName['InstantDamage'].displayName} II`,
                'weakness': `- ${mcData.effectsByName['Weakness'].displayName} (1:30)`,
                'long_weakness': `- ${mcData.effectsByName['Weakness'].displayName} (4:00)`,
                'poison': `- ${mcData.effectsByName['Poison'].displayName} (0:30)`,
                'long_poison': `- ${mcData.effectsByName['Poison'].displayName} (1:30)`,
                'strong_poison': `- ${mcData.effectsByName['Poison'].displayName} II (0:21)`,
                'turtle_master': `- ${mcData.effectsByName['Slowness'].displayName} IV (0:20)\n- ${mcData.effectsByName['Resistance'].displayName} III (0:20)`,
                'strong_turtle_master': `- ${mcData.effectsByName['Slowness'].displayName} VI (0:20)\n- ${mcData.effectsByName['Resistance'].displayName} IV (0:20)`,
                'long_turtle_master': `- ${mcData.effectsByName['Slowness'].displayName} IV (0:40)\n- ${mcData.effectsByName['Resistance'].displayName} III (0:40)`,
                'mundane': `- No Effects (Mundane)`,
                'thick': `- No Effects (Thick)`,
                'awkward': `- No Effects (Awkward)`,
                'water': `- No Effects (Water)`,
            };


            const formattedEffects = effectByPotionName[tag?.Potion?.split(':').pop()];
            embed.addFields(addPh(
                keys.commands.inventory.success.item_potion.embeds[0].fields,
                { effects: formattedEffects },
            ));

            addedInfo = true;
        }

        return addedInfo;
    }

    pushInvButton(buttons, maxSlot, item, index) {
        if(item.Slot > maxSlot) return;

        //Push button for each item in the inventory
        const itemId = item.id.split(':').pop();
        const slot = item.Slot;
        buttons.push(getComponent(
            keys.commands.inventory.success.item_button,
            {
                slot: armorSlotNames[slot] ?? `#${slot}`,
                index: item.parentIndex ? `${item.parentIndex}_${index}` : index,
                name: mcData.itemsByName[itemId]?.displayName ?? itemId,
            },
        ));
    }


    romanNumber(number) {
        //Enchantments don't show level 1
        if(number === 1) return '';

        //Convert integers to roman numbers
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
        return romanNumerals[number - 1] ?? number;
    }

    // https://gist.github.com/ddevault/459a1691c3dd751db160
    dataSlotToNetworkSlot(index) {
        if(index === 100)
            index = 8;
        else if(index === 101)
            index = 7;
        else if(index === 102)
            index = 6;
        else if(index === 103)
            index = 5;
        else if(index === -106)
            index = 45;
        else if(index <= 8)
            index += 36;
        else if(index >= 80 && index <= 83)
            index -= 79;
        return index;
    }
}

async function renderContainer(backgroundPath, items, slotCoords, player, loopCode = (item, index) => {}) {
    const canvas = new Canvas(352, 332);
    const ctx = canvas.getContext('2d');
    const background = await Canvas.loadImage(backgroundPath);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    for(let i = 0; i < items.length; i++) {
        const slot = items[i].Slot;
        const itemId = items[i].id.split(':').pop();
        const count = items[i].Count;
        const damage = items[i].tag?.Damage;

        const [x, y] = slotCoords[slot] ?? [];
        if(!x || !y) continue; //Continue for modded slots

        try {
            //Draw image
            const itemImg = await Canvas.loadImage(`./resources/images/items/${itemId}.png`);
            ctx.drawImage(itemImg, x, y, 32, 32);
        }
        catch(err) {
            //Draw name
            console.log(addPh(keys.commands.inventory.errors.no_image.console, { 'item_name': itemId }));
            ctx.font = '8px Minecraft';
            ctx.fillStyle = '#000';
            const lines = utils.wrapText(ctx, mcData.itemsByName[itemId].displayName, 32);
            lines.forEach((line, i) => ctx.fillText(line, x, y + 8 + i * 8));
        }

        //Draw count
        if(count > 1) utils.drawMinecraftNumber(ctx, count, x, y + 16);

        const maxDurability = mcData.itemsByName[itemId]?.maxDurability;
        if(damage && maxDurability) {
            const durabilityPercent = 100 - damage / maxDurability * 100;
            const durabilityPx = Math.floor(durabilityPercent / 100 * 34);

            //Get gradient color between green and red
            const r = Math.floor((100 - durabilityPercent) * 2.56);
            const g = Math.floor(durabilityPercent * 2.56);
            const rgb = [r, g, 0];

            //Draw durability bar
            ctx.strokeStyle = `rgb(${rgb.join(',')})`;
            ctx.fillStyle = `rgb(${rgb.join(',')})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, y + 28);
            ctx.lineTo(x + durabilityPx, y + 28);
            ctx.stroke();
            ctx.closePath();

            ctx.strokeStyle = `#000000`;
            ctx.fillStyle = `#000000`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, y + 31);
            ctx.lineTo(x + 33, y + 31);
            ctx.stroke();
            ctx.closePath();
        }

        loopCode(items[i], i);
    }

    const outputPath = '/home/opc/html/wp-content/uploads/inventory';
    const fileName = `Inventory_Player_${player}.png`;
    const filePath = path.join(outputPath, fileName);

    // Asegúrate de que el directorio existe
    fs.mkdirSync(outputPath, { recursive: true });

    // Guarda la imagen en el sistema de archivos
    const buffer = await canvas.toBuffer('png');
    fs.writeFileSync(filePath, buffer);

    return { canvas, ctx };
}

// Get the list of files from the directory
const playerDataDir = '/home/opc/html/wp-content/uploads/playerdata';
const files = fs.readdirSync(playerDataDir).map(filename => {
    const uuid = path.parse(filename).name; // Extract uuid from filename
    return { user: { uuid, username: uuid }, showDetails: false }; // Always set showDetails to false
});

// Instantiate Inventory class
const inventory = new Inventory();

// Loop through each file and call the execute method
for (const file of files) {
    inventory.execute(file, { online: true }); // Pass your server object as needed
}

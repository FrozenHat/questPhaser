import Phaser from 'phaser';
import Player from '../entities/Player.js';
import NavigationSystem from '../systems/NavigationSystem.js';

export default class HubScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HubScene' });
        this.backgroundImage = null;
        this.dialogActive = false;
        this.taxiDialog = null;
    }

    create() {
        console.log('HubScene: Started');

        // Create player animations
        this.createPlayerAnimations();

        // Add hub background image
        this.backgroundImage = this.add.image(0, 0, 'hub_background').setOrigin(0, 0);
        
        // Get background dimensions
        const bgWidth = this.backgroundImage.width;
        const bgHeight = this.backgroundImage.height;

        // Set world bounds to background size
        this.physics.world.setBounds(0, 0, bgWidth, bgHeight);

        // Configure camera
        this.setupCamera(bgWidth, bgHeight);

        // Add title (fixed to camera)
        this.titleText = this.add.text(0, 50, 'Quest Phaser - Hub', {
            font: '32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0);

        // Add instructions (fixed to camera)
        this.instructionsText = this.add.text(0, 100, 'Click anywhere to move the player', {
            font: '16px Arial',
            fill: '#cccccc'
        }).setOrigin(0.5).setScrollFactor(0);

        // Create player
        this.player = new Player(this, 0, 0);
        // После создания player и bgHeight:
        this.perspective = {
        topY: Math.floor(bgHeight * 0.4),    // верх кадра (дальше)
        bottomY: Math.floor(bgHeight * 0.92), // низ кадра (ближе)
        minScale: 0.1,                       // размер вдали
        maxScale: 1,                       // размер вблизи
        smooth: 0.9                         // плавность
        };

    // стартовый масштаб
    this.applyPerspectiveScale(true);

        // Navigation
        this.navigationSystem = new NavigationSystem(this, this.player);

        // Спавн СЛЕВА (а не по центру)
        const desiredSpawnX = Math.floor(bgWidth * 0.12);
        const desiredSpawnY = Math.floor(bgHeight * 0.90);
        const spawn = this.navigationSystem.findNearestWalkablePoint(desiredSpawnX, desiredSpawnY);

        if (spawn) {
            this.player.sprite.setPosition(spawn.x, spawn.y);
        } else {
            this.player.sprite.setPosition(desiredSpawnX, desiredSpawnY);
        }

        // Объект-перекрытие (PNG с альфой), "опорная точка" снизу
        this.occluder = this.add.image(
            Math.floor(bgWidth*0.388 ),
            Math.floor(bgHeight*0.905 ),
            'hub_occluder'
        ).setOrigin(0.5, 1);

        // Базовая глубина; далее в update будет y-sort
        this.occluder.setDepth(this.occluder.y);

        // Camera follows player
        this.cameras.main.startFollow(this.player.sprite, false);

        // Initialize navigation system
        this.navigationSystem = new NavigationSystem(this, this.player);

        // Set up point-and-click interaction
        this.input.on('pointerdown', (pointer) => {
            if (this.dialogActive) return;
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            this.navigationSystem.moveTo(worldX, worldY);
        });

        // Add some visual areas/zones
        this.createInteractiveZones(bgWidth, bgHeight);

        // Handle resize
        this.scale.on('resize', this.handleResize, this);
        this.handleResize();
    }

    createPlayerAnimations() {
        // Walking animations
        this.anims.create({
            key: 'walk_Right',
            frames: this.anims.generateFrameNumbers('player', { start: 40, end: 54 }),
            frameRate: 20,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_Up',
            frames: this.anims.generateFrameNumbers('player', { start: 56, end: 69 }),
            frameRate: 20,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_Down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 19 }),
            frameRate: 20,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_UpRight',
            frames: this.anims.generateFrameNumbers('player', { start: 71, end: 84 }),
            frameRate: 20,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_DownRight',
            frames: this.anims.generateFrameNumbers('player', { start: 21, end: 39 }),
            frameRate: 20,
            repeat: -1
        });

        // Idle animations
        this.anims.create({
            key: 'idle_Right',
            frames: this.anims.generateFrameNumbers('player', { start: 42, end: 43 }),
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'idle_Up',
            frames: this.anims.generateFrameNumbers('player', { start: 56, end: 56 }),
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'idle_Down',
            frames: this.anims.generateFrameNumbers('player', { start: 2, end: 2 }),
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'idle_UpRight',
            frames: this.anims.generateFrameNumbers('player', { start: 73, end: 73 }),
            frameRate: 5,
            repeat: -1
        });

        this.anims.create({
            key: 'idle_DownRight',
            frames: this.anims.generateFrameNumbers('player', { start: 23, end: 23 }),
            frameRate: 5,
            repeat: -1
        });
    }

    setupCamera(bgWidth, bgHeight) {
        const camera = this.cameras.main;
        
        // Set camera bounds to background size
        camera.setBounds(0, 0, bgWidth, bgHeight);
        
        // Set deadzone for smoother following
        camera.setDeadzone(100, 100);
        
        // Initial zoom
        camera.setZoom(1);
    }

    handleResize() {
        const camera = this.cameras.main;
        const bgWidth = this.backgroundImage.width;
        const bgHeight = this.backgroundImage.height;
        
        // Update camera viewport size
        const width = this.scale.width;
        const height = this.scale.height;
        
        camera.setViewport(0, 0, width, height);
        
        // Calculate camera bounds
        let boundsX = 0;
        let boundsY = 0;
        let boundsWidth = bgWidth;
        let boundsHeight = bgHeight;
        
        // If camera height is bigger than background, center vertically
        if (height > bgHeight) {
            const offsetY = (height - bgHeight) / 2;
            boundsY = -offsetY;
            boundsHeight = height;
        }
        
        // If camera width is bigger than background, center horizontally
        if (width > bgWidth) {
            const offsetX = (width - bgWidth) / 2;
            boundsX = -offsetX;
            boundsWidth = width;
        }
        
        camera.setBounds(boundsX, boundsY, boundsWidth, boundsHeight);
        
        // Update UI element positions to center of viewport
        if (this.titleText) {
            this.titleText.setPosition(width / 2, 50);
        }
        if (this.instructionsText) {
            this.instructionsText.setPosition(width / 2, 100);
        }
    }

    createInteractiveZones(bgWidth, bgHeight) {
        // Create some example interactive zones
        // const zone1 = this.add.rectangle(bgWidth * 0.25, bgHeight * 0.7, 100, 100, 0x4a90e2, 0.5);
        // zone1.setInteractive({ useHandCursor: true });
        // zone1.on('pointerdown', (pointer, localX, localY, event) => {
        //     console.log('Zone 1 clicked');
        //     this.add.text(zone1.x, zone1.y - 50, 'Zone 1!', {
        //         font: '16px Arial',
        //         fill: '#ffffff'
        //     }).setOrigin(0.5);
        //     // Stop propagation so navigation doesn't trigger
        //     event.stopPropagation();
        // });

        const zone2 = this.add.zone(bgWidth * 0.87, bgHeight * 0.7, 280, 120)
            .setName('zone2')
            .setInteractive({ useHandCursor: true });

        const zone2Graphics = this.add.graphics();
        zone2Graphics.lineStyle(2, 0xffd166, 0.8);
        zone2Graphics.strokeRect(
            zone2.x - zone2.width / 2,
            zone2.y - zone2.height / 2,
            zone2.width,
            zone2.height
        );

        zone2.on('pointerdown', () => {
            if (!this.dialogActive) this.showTaxiDialog();
        });
    }

    update(time, delta) {
        // Update game logic
        if (this.player) {
            this.player.update();
        }
        this.navigationSystem?.enforcePlayerOnNavmesh();

        if (this.player?.sprite) {
            // y-sort: кто ниже по экрану, тот "спереди"
            this.player.sprite.setDepth(this.player.sprite.y);
        }

        if (this.occluder) {
            this.occluder.setDepth(this.occluder.y);
        }

        if (this.player?.sprite) {
            // Перспектива
            this.applyPerspectiveScale();

            // y-depth сортировка (у вас уже может быть)
            this.player.sprite.setDepth(this.player.sprite.y);
        }

        if (this.occluder) {
            this.occluder.setDepth(this.occluder.y);
        }
    }

    shutdown() {
        // Clean up resize listener
        this.scale.off('resize', this.handleResize, this);
    }

    showTaxiDialog() {
        this.dialogActive = true;

        const cam = this.cameras.main;
        const centerX = cam.midPoint.x;
        const centerY = cam.midPoint.y;

        // Базовые элементы диалога (не удаляем между этапами)
        const overlay = this.add.rectangle(centerX, centerY, cam.width, cam.height, 0x000000, 0.6)
            .setScrollFactor(0)
            .setInteractive();

        const panel = this.add.rectangle(centerX, centerY, 620, 340, 0x202225, 0.95)
            .setScrollFactor(0)
            .setStrokeStyle(2, 0xffffff, 0.3);

        this.taxiDialog = this.add.container(0, 0, [overlay, panel]).setDepth(1000);

        // Этап 1: вопрос + варианты ответа
        const question = this.add.text(centerX, centerY - 110, 'Таксист: «Куда едем, дорогой?»', {
            fontFamily: 'Arial',
            fontSize: '26px',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: 540 }
        }).setOrigin(0.5).setScrollFactor(0);

        const narratorLabel = this.add.text(centerX, centerY - 45, 'Рассказчик выбирает:', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#c9d1d9'
        }).setOrigin(0.5).setScrollFactor(0);

        const options = ['На Ромашку', 'К Цветнику', 'К Китайской беседке'];
        const buttons = options.map((label, idx) =>
            this.createDialogButton(centerX, centerY + 20 + idx * 52, label, () => this.handleTaxiChoice(label))
        );

        this.taxiDialog.add([question, narratorLabel, ...buttons]);
    }

    createDialogButton(x, y, label, onSelect) {
        const button = this.add.text(x, y, label, {
            fontFamily: 'Arial',
            fontSize: '22px',
            color: '#ffffff',
            backgroundColor: '#2d333b',
            padding: { left: 12, right: 12, top: 6, bottom: 6 }
        }).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });

        button.on('pointerover', () => button.setStyle({ backgroundColor: '#3c444d' }));
        button.on('pointerout', () => button.setStyle({ backgroundColor: '#2d333b' }));
        button.on('pointerdown', onSelect);

        return button;
    }

    handleTaxiChoice(choice) {
        if (!this.taxiDialog) return;

        // Удаляем все элементы, кроме overlay и panel (первые 2 объекта в контейнере)
        const keep = this.taxiDialog.list.slice(0, 2);
        const toRemove = this.taxiDialog.list.slice(2);
        toRemove.forEach((obj) => obj.destroy());
        this.taxiDialog.removeAll();
        this.taxiDialog.add(keep);

        const cam = this.cameras.main;
        const centerX = cam.midPoint.x;
        const centerY = cam.midPoint.y;

        // Этап 2: ответ таксиста
        const narratorLine = this.add.text(centerX, centerY - 40, `Рассказчик: «${choice}»`, {
            fontFamily: 'Arial',
            fontSize: '22px',
            color: '#95d5b2',
            align: 'center',
            wordWrap: { width: 540 }
        }).setOrigin(0.5).setScrollFactor(0);

        const taxiLine = this.add.text(centerX, centerY + 20,
            'Таксист: «Без проблем! Садись, можно не пристегиваться, у меня брат в полиции работает!»', {
                fontFamily: 'Arial',
                fontSize: '21px',
                color: '#f9c74f',
                align: 'center',
                wordWrap: { width: 560 }
            }).setOrigin(0.5).setScrollFactor(0);

        // Этап 3: кнопка перехода
        const goButton = this.createDialogButton(centerX, centerY + 120, 'Поехали!', () => {
            this.dialogActive = false;
            this.taxiDialog?.destroy();
            this.taxiDialog = null;
            this.scene.start('BootScene'); // если у вас ключ сцены именно BootSceen, замените строку
        });

        this.taxiDialog.add([narratorLine, taxiLine, goButton]);
    }

    applyPerspectiveScale(force = false) {
        if (!this.player?.sprite || !this.perspective) return;

        const p = this.perspective;
        const y = this.player.sprite.y;

        // Нормализация 0..1 по вертикали сцены
        const tRaw = (y - p.topY) / (p.bottomY - p.topY);
        const t = Phaser.Math.Clamp(tRaw, 0, 1);

        // Вверх -> меньше, вниз -> больше
        const targetScale = Phaser.Math.Linear(p.minScale, p.maxScale, t);

        if (force) {
            this.player.sprite.setScale(targetScale);
            return;
        }

        // Плавное изменение масштаба
        const current = this.player.sprite.scaleX;
        const next = Phaser.Math.Linear(current, targetScale, p.smooth);
        this.player.sprite.setScale(next);
    }
}

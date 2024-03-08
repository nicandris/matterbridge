/**
 * This file contains the class Matterbridge.
 *
 * @file matterbridge.ts
 * @author Luca Liguori
 * @date 2023-12-29
 * @version 1.1.1
 *
 * Copyright 2023, 2024 Luca Liguori.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. *
 */

import { MatterbridgeDevice } from './matterbridgeDevice.js';

import { NodeStorageManager, NodeStorage } from 'node-persist-manager';
import { AnsiLogger, BRIGHT, GREEN, RESET, TimestampFormat, UNDERLINE, UNDERLINEOFF, YELLOW, db, debugStringify, stringify, er, nf, rs, wr } from 'node-ansi-logger';
import { fileURLToPath, pathToFileURL } from 'url';
import { promises as fs } from 'fs';
import EventEmitter from 'events';
import express from 'express';
import os from 'os';
import path from 'path';

import { CommissioningController, CommissioningServer, MatterServer } from '@project-chip/matter-node.js';
import { BasicInformationCluster, BridgedDeviceBasicInformationCluster, ClusterServer } from '@project-chip/matter-node.js/cluster';
import { DeviceTypeId, EndpointNumber, VendorId } from '@project-chip/matter-node.js/datatype';
import { Aggregator, Device, DeviceTypes } from '@project-chip/matter-node.js/device';
import { Format, Level, Logger } from '@project-chip/matter-node.js/log';
import { QrCodeSchema } from '@project-chip/matter-node.js/schema';
import { StorageBackendDisk, StorageBackendJsonFile, StorageContext, StorageManager } from '@project-chip/matter-node.js/storage';
import { requireMinNodeVersion, getParameter, getIntParameter, hasParameter } from '@project-chip/matter-node.js/util';
import { CryptoNode } from '@project-chip/matter-node.js/crypto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { logEndpoint } from '@project-chip/matter-node.js/device';

/*
2024-03-01 10:37:00.103 DEBUG InteractionServer    Read attribute from udp://fe80::1440:2ed8:12e9:abaa%9:53296 on session secure/13065: unknown(0x3)/0x39/0x11: unsupported path: Status=127      
2024-03-01 10:37:00.100 DEBUG InteractionServer    Read attribute from udp://fe80::1440:2ed8:12e9:abaa%9:53296 on session secure/13065: unknown(0x3)/0x2f/0xc: unsupported path: Status=127       
2024-03-01 10:37:00.235 DEBUG InteractionServer    Read attribute from udp://fe80::1440:2ed8:12e9:abaa%9:53296 on session secure/13065: unknown(0x2)/0x39/0x11: unsupported path: Status=127      
2024-03-01 10:36:37.934 DEBUG InteractionServer    Read attribute from udp://fe80::1440:2ed8:12e9:abaa%9:53296 on session secure/13065: unknown(0x3)/0x2f/0xc: unsupported path: Status=127       
2024-03-01 10:36:38.085 DEBUG InteractionServer    Read attribute from udp://fe80::1440:2ed8:12e9:abaa%9:53296 on session secure/13065: unknown(0x3)/0x39/0x11: unsupported path: Status=127      
2024-03-01 11:18:09.605 DEBUG InteractionServer    
Read attribute from udp://fe80::1440:2ed8:12e9:abaa%9:53296 on session secure/22668: MA-rootdevice(0x0)/unknown(0x2f)/0xf: unsupported path: Status=195
2024-03-01 11:18:09.477 DEBUG InteractionServer    Read attribute from udp://fe80::1440:2ed8:12e9:abaa%9:53296 on session secure/22668: MA-rootdevice(0x0)/unknown(0x2f)/0xc: unsupported path: St

2024-03-01 11:26:37.414 DEBUG InteractionServer    
Read attribute from udp://fe80::1440:2ed8:12e9:abaa%9:53296 on session secure/50514: MA-rootdevice(0x0)/unknown(0x2f)/0xc: unsupported path: Status=195
2024-03-01 11:26:37.981 DEBUG InteractionServer    
Read attribute from udp://fe80::1440:2ed8:12e9:abaa%9:53296 on session secure/50514: MA-rootdevice(0x0)/unknown(0x2f)/0xf: unsupported path: Status=195

2024-03-02 16:56:36.529 DEBUG CommissioningServer  No unique id found for endpoint on index 0 / device MA-aggregator - using index as unique identifier!
2024-03-02 16:56:36.530 DEBUG CommissioningServer  Restored endpoint id 1 for endpoint with unique_7ceafd7c19bea5f3-index_0 / device MA-aggregator from storage
2024-03-02 16:56:36.530 DEBUG CommissioningServer  Restored endpoint id 2 for endpoint with unique_7ceafd7c19bea5f3-index_0-unique_BridgedDevice1 0x01020564 / device MA-windowcovering from stora

2024-03-08 13:42:47.547 DEBUG InteractionServer    
Received read request from udp://fe80::1c57:1ab7:fc98:4c20%9:62577 on session secure/52121: attributes:unknown(0x2)/0x2f/0xfffd, events:none isFabricFiltered=true
2024-03-08 13:42:47.547 DEBUG InteractionServer    
Read attribute from udp://fe80::1c57:1ab7:fc98:4c20%9:62577 on session secure/52121: unknown(0x2)/0x2f/0xfffd: unsupported path: Status=127

2024-03-08 13:42:47.410 DEBUG InteractionServer    
Received read request from udp://fe80::1c57:1ab7:fc98:4c20%9:62577 on session secure/52121: attributes:unknown(0x2)/0x1d/0xfffa, events:none isFabricFiltered=true
2024-03-08 13:42:47.410 DEBUG InteractionServer    
Read attribute from udp://fe80::1c57:1ab7:fc98:4c20%9:62577 on session secure/52121: unknown(0x2)/0x1d/0xfffa: unsupported path: Status=127

2024-03-08 13:52:48.894 DEBUG InteractionServer    
Received read request from udp://fe80::1c57:1ab7:fc98:4c20%9:62577 on session secure/25044: attributes:MA-contactsensor(0x1)/BooleanState(0x45)/unknown(0xfe), events:none isFabricFiltered=true
2024-03-08 13:52:48.895 DEBUG InteractionServer    
Read attribute from udp://fe80::1c57:1ab7:fc98:4c20%9:62577 on session secure/25044: MA-contactsensor(0x1)/BooleanState(0x45)/unknown(0xfe): unsupported path: Status=134

*/

// Define an interface of common elements from MatterbridgeDynamicPlatform and MatterbridgeAccessoryPlatform
interface MatterbridgePlatform {
  onStart(reason?: string): Promise<this>;
  onShutdown(reason?: string): Promise<this>;
  matterbridge: Matterbridge;
  log: AnsiLogger;
  name: string;
  type: string;
}

// Define an interface for storing the plugins
interface RegisteredPlugin extends BaseRegisteredPlugin {
  storageContext?: StorageContext;
  commissioningServer?: CommissioningServer;
  aggregator?: Aggregator;
  platform?: MatterbridgePlatform;
  //[key: string]: string | boolean | StorageContext | CommissioningServer | Aggregator | MatterbridgePlatform | undefined;
}

interface BaseRegisteredPlugin {
  path: string;
  type: string;
  name: string;
  version: string;
  description: string;
  author: string;
  registeredDevices?: number;
  loaded?: boolean;
  started?: boolean;
  enabled?: boolean;
  paired?: boolean;
  connected?: boolean;
}

// Define an interface for storing the devices
interface RegisteredDevice {
  plugin: string;
  device: MatterbridgeDevice;
  added?: boolean;
}

// Define an interface for storing the system information
interface SystemInformation {
  ipv4Address: string;
  ipv6Address: string;
  nodeVersion: string;
  hostname: string;
  osType: string;
  osRelease: string;
  osPlatform: string;
  osArch: string;
  totalMemory: string;
  freeMemory: string;
  systemUptime: string;
}

// Define an interface for the event map
export interface MatterbridgeEvents {
  shutdown: (reason: string) => void;
  startAccessoryPlatform: (reason: string) => void;
  startDynamicPlatform: (reason: string) => void;
  registerDeviceAccessoryPlatform: (device: MatterbridgeDevice) => void;
  registerDeviceDynamicPlatform: (device: MatterbridgeDevice) => void;
}

const plg = '\u001B[38;5;33m';
const dev = '\u001B[38;5;79m';

export class Matterbridge extends EventEmitter {
  public systemInformation: SystemInformation = {
    ipv4Address: '',
    ipv6Address: '',
    nodeVersion: '',
    hostname: '',
    osType: '',
    osRelease: '',
    osPlatform: '',
    osArch: '',
    totalMemory: '',
    freeMemory: '',
    systemUptime: '',
  };
  public homeDirectory!: string;
  public rootDirectory!: string;
  public matterbridgeDirectory!: string;

  public bridgeMode: 'bridge' | 'childbridge' | 'controller' | '' = '';

  private log!: AnsiLogger;
  private hasCleanupStarted = false;
  private registeredPlugins: RegisteredPlugin[] = [];
  private registeredDevices: RegisteredDevice[] = [];
  private storage: NodeStorageManager | undefined = undefined;
  private context: NodeStorage | undefined = undefined;
  private app!: express.Express;

  private storageManager!: StorageManager;
  private matterbridgeContext!: StorageContext;
  private mattercontrollerContext!: StorageContext;

  private matterServer!: MatterServer;
  private matterAggregator!: Aggregator;
  private commissioningServer!: CommissioningServer;
  private commissioningController!: CommissioningController;

  private static instance: Matterbridge;

  private constructor() {
    super();
  }

  static async loadInstance() {
    if (!Matterbridge.instance) {
      Matterbridge.instance = new Matterbridge();
      await Matterbridge.instance.initialize();
    } else {
      throw new Error('Matterbridge instance already exists');
    }
    return Matterbridge.instance;
  }

  public async initialize() {
    // Display the help
    if (hasParameter('help')) {
      // eslint-disable-next-line no-console
      console.log(`\nUsage: matterbridge [options]\n
      Options:
      - help:                  show the help
      - bridge:                start Matterbridge in bridge mode
      - childbridge:           start Matterbridge in childbridge mode
      - frontend [port]:       start the frontend on the given port (default 3000)
      - list:                  list the registered plugins
      - add [plugin path]:     register the plugin
      - remove [plugin path]:  remove the plugin
      - enable [plugin path]:  enable the plugin
      - disable [plugin path]: disable the plugin\n`);
      process.exit(0);
    }

    // set Matterbridge logger
    this.log = new AnsiLogger({ logName: 'Matterbridge', logTimestampFormat: TimestampFormat.TIME_MILLIS });
    this.log.info('Matterbridge is running...');

    // log system info and create .matterbridge directory
    await this.logNodeAndSystemInfo();

    // check node version and throw error
    requireMinNodeVersion(18);

    // register SIGINT SIGTERM signal handlers
    this.registerSignalHandlers();

    // set matter.js logger level and format
    Logger.defaultLogLevel = Level.DEBUG;
    Logger.format = Format.ANSI;

    // Initialize NodeStorage
    this.storage = new NodeStorageManager({ dir: path.join(this.matterbridgeDirectory, 'storage') });
    this.context = await this.storage.createStorage('matterbridge');
    this.registeredPlugins = await this.context?.get<RegisteredPlugin[]>('plugins', []);

    // Parse command line
    this.parseCommandLine();
  }

  private async parseCommandLine() {
    if (hasParameter('list')) {
      this.log.info('Registered plugins:');
      this.registeredPlugins.forEach((plugin) => {
        this.log.info(`- ${plg}${plugin.name}${nf} '${plg}${BRIGHT}${plugin.description}${RESET}${nf}' type: ${GREEN}${plugin.type}${nf} enable: ${plugin.enabled}`);
      });
      process.exit(0);
    }
    if (getParameter('add')) {
      this.log.debug(`Registering plugin ${getParameter('add')}`);
      await this.loadPlugin(getParameter('add')!, 'add');
      process.exit(0);
    }
    if (getParameter('remove')) {
      this.log.debug(`Unregistering plugin ${getParameter('remove')}`);
      await this.loadPlugin(getParameter('remove')!, 'remove');
      process.exit(0);
    }
    if (getParameter('enable')) {
      this.log.debug(`Enable plugin ${getParameter('enable')}`);
      await this.loadPlugin(getParameter('enable')!, 'enable');
      process.exit(0);
    }
    if (getParameter('disable')) {
      this.log.debug(`Disable plugin ${getParameter('disable')}`);
      await this.loadPlugin(getParameter('disable')!, 'disable');
      process.exit(0);
    }

    // Start the storage (we need it now for frontend and later for matterbridge)
    await this.startStorage('json', path.join(this.matterbridgeDirectory, 'matterbridge.json'));

    // Initialize frontend
    await this.initializeFrontend(getIntParameter('frontend'));

    if (hasParameter('childbridge')) {
      this.bridgeMode = 'childbridge';
      this.registeredPlugins.forEach(async (plugin) => {
        if (!plugin.enabled) return;
        this.log.info(`Loading registered plugin ${plg}${plugin.name}${nf} type ${GREEN}${plugin.type}${nf}`);
        await this.loadPlugin(plugin.path, 'load');
      });
      await this.startMatterBridge();
    }
    if (hasParameter('bridge')) {
      this.bridgeMode = 'bridge';
      this.registeredPlugins.forEach(async (plugin) => {
        if (!plugin.enabled) return;
        this.log.info(`Loading registered plugin ${plg}${plugin.name}${nf} type ${GREEN}${plugin.type}${nf}`);
        await this.loadPlugin(plugin.path, 'load');
      });
      await this.startMatterBridge();
    }
  }

  // Typed method for emitting events
  override emit<Event extends keyof MatterbridgeEvents>(event: Event, ...args: Parameters<MatterbridgeEvents[Event]>): boolean {
    return super.emit(event, ...args);
  }

  // Typed method for listening to events
  override on<Event extends keyof MatterbridgeEvents>(event: Event, listener: MatterbridgeEvents[Event]): this {
    super.on(event, listener);
    return this;
  }

  private async loadPlugin(packageJsonPath: string, mode = 'load') {
    if (!packageJsonPath.endsWith('package.json')) packageJsonPath = path.join(packageJsonPath, 'package.json');
    packageJsonPath = path.resolve(packageJsonPath);
    this.log.debug(`Loading plugin from ${plg}${packageJsonPath}${db}`);
    try {
      // Load the package.json of the plugin
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const plugin = this.registeredPlugins.find((plugin) => plugin.name === packageJson.name);
      if (plugin && plugin.platform) {
        this.log.error(`Plugin ${plg}${plugin.name}${er} already loaded`);
      }
      // Resolve the main module path relative to package.json
      const pluginPath = path.resolve(path.dirname(packageJsonPath), packageJson.main);
      // Convert the file path to a URL
      const pluginUrl = pathToFileURL(pluginPath);
      // Dynamically import the plugin
      this.log.debug(`Importing plugin ${plg}${plugin?.name}${db} from ${pluginUrl.href}`);
      const pluginInstance = await import(pluginUrl.href);
      this.log.debug(`Imported plugin ${plg}${plugin?.name}${db} from ${pluginUrl.href}`);
      // Call the default export function of the plugin, passing this MatterBridge instance
      if (pluginInstance.default) {
        const platform: MatterbridgePlatform = pluginInstance.default(this, new AnsiLogger({ logName: packageJson.description, logTimestampFormat: TimestampFormat.TIME_MILLIS }));
        platform.name = packageJson.name;
        if (mode === 'load') {
          this.log.info(`Plugin ${plg}${plugin?.name}${nf} type ${GREEN}${platform.type}${nf} loaded (entrypoint ${UNDERLINE}${pluginPath}${UNDERLINEOFF})`);
          // Update plugin info
          if (plugin) {
            plugin.path = packageJsonPath;
            plugin.name = packageJson.name;
            plugin.description = packageJson.description;
            plugin.version = packageJson.version;
            plugin.author = packageJson.author;
            plugin.type = platform.type;
            plugin.loaded = true;
            plugin.platform = platform;
          } else {
            this.log.error(`Plugin ${plg}${packageJson.name}${er} not found`);
          }
        } else if (mode === 'add') {
          if (!this.registeredPlugins.find((plugin) => plugin.name === packageJson.name)) {
            this.registeredPlugins.push({
              path: packageJsonPath,
              type: platform.type,
              name: packageJson.name,
              version: packageJson.version,
              description: packageJson.description,
              author: packageJson.author,
              enabled: true,
            });
            await this.context?.set<RegisteredPlugin[]>('plugins', this.registeredPlugins);
            this.log.info(`Plugin ${plg}${packageJsonPath}${nf} type ${platform.type} added to matterbridge`);
          } else {
            this.log.warn(`Plugin ${plg}${packageJsonPath}${wr} already added to matterbridge`);
          }
        } else if (mode === 'remove') {
          if (this.registeredPlugins.find((registeredPlugin) => registeredPlugin.name === packageJson.name)) {
            this.registeredPlugins.splice(
              this.registeredPlugins.findIndex((registeredPlugin) => registeredPlugin.name === packageJson.name),
              1,
            );
            await this.context?.set<RegisteredPlugin[]>('plugins', this.registeredPlugins);
            this.log.info(`Plugin ${plg}${packageJsonPath}${nf} removed from matterbridge`);
          } else {
            this.log.warn(`Plugin ${plg}${packageJsonPath}${wr} not registerd in matterbridge`);
          }
        } else if (mode === 'enable') {
          const plugin = this.registeredPlugins.find((registeredPlugin) => registeredPlugin.name === packageJson.name);
          if (plugin) {
            plugin.enabled = true;
            await this.context?.set<RegisteredPlugin[]>('plugins', this.registeredPlugins);
            this.log.info(`Plugin ${plg}${packageJsonPath}${nf} enabled`);
          } else {
            this.log.warn(`Plugin ${plg}${packageJsonPath}${wr} not registerd in matterbridge`);
          }
        } else if (mode === 'disable') {
          const plugin = this.registeredPlugins.find((registeredPlugin) => registeredPlugin.name === packageJson.name);
          if (plugin) {
            plugin.enabled = false;
            await this.context?.set<RegisteredPlugin[]>('plugins', this.registeredPlugins);
            this.log.info(`Plugin ${plg}${packageJsonPath}${nf} disabled`);
          } else {
            this.log.warn(`Plugin ${plg}${packageJsonPath}${wr} not registerd in matterbridge`);
          }
        } else {
          this.log.error(`Plugin at ${plg}${pluginPath}${er} does not provide a default export`);
        }
      }
    } catch (err) {
      this.log.error(`Failed to load plugin from ${plg}${packageJsonPath}${er}: ${err}`);
    }
  }

  private async registerSignalHandlers() {
    process.on('SIGINT', async () => {
      await this.cleanup('SIGINT received, cleaning up...');
    });

    process.on('SIGTERM', async () => {
      await this.cleanup('SIGTERM received, cleaning up...');
    });
  }

  private async cleanup(message: string) {
    if (!this.hasCleanupStarted) {
      this.hasCleanupStarted = true;
      this.log.debug(message);

      // Callint the shutdown functions with a reason
      this.registeredPlugins.forEach((plugin) => {
        if (plugin.platform) {
          plugin.platform.onShutdown('Matterbridge is closing: ' + message);
        }
      });

      // Set reachability to false
      /*
      this.log.debug(`*Changing reachability to false for ${this.registeredDevices.length} devices (${this.bridgeMode} mode):`);
      this.registeredDevices.forEach((registeredDevice) => {
        const plugin = this.registeredPlugins.find((plugin) => plugin.name === registeredDevice.plugin);
        if (!plugin) {
          this.log.error(`Plugin ${plg}${registeredDevice.plugin}${er} not found`);
          return;
        }
        this.log.debug(`*-- device: ${dev}${registeredDevice.device.name}${db} plugin ${plg}${registeredDevice.plugin}${db} type ${GREEN}${plugin.type}${db}`);
        if (this.bridgeMode === 'bridge') registeredDevice.device.setBridgedDeviceReachability(false);
        if (this.bridgeMode === 'childbridge' && plugin.type === 'DynamicPlatform') plugin.aggregator?.removeBridgedDevice(registeredDevice.device);
        if (this.bridgeMode === 'childbridge') plugin.commissioningServer?.setReachability(false);
        if (this.bridgeMode === 'childbridge' && plugin.type === 'AccessoryPlatform') this.setReachableAttribute(registeredDevice.device, false);
        if (this.bridgeMode === 'childbridge' && plugin.type === 'DynamicPlatform') registeredDevice.device.setBridgedDeviceReachability(false);
      });
      */

      setTimeout(async () => {
        // Closing matter
        await this.stopMatter();

        // Closing storage
        await this.stopStorage();

        //await this.context?.set<RegisteredDevice[]>('plugins', this.registeredDevices);

        this.log.debug('Cleanup completed.');
        process.exit(0);
      }, 2 * 1000);
    }
  }

  private async setReachableAttribute(device: Device, reachable: boolean) {
    const basicInformationCluster = device.getClusterServer(BasicInformationCluster);
    if (!basicInformationCluster) {
      this.log.error('setReachableAttribute BasicInformationCluster needs to be set!');
      return;
    }
    basicInformationCluster.setReachableAttribute(reachable);
  }

  async addDevice(pluginName: string, device: MatterbridgeDevice) {
    this.log.info(`Adding device ${dev}${device.name}${nf} for plugin ${plg}${pluginName}${nf}`);

    // Check if the plugin is registered
    const plugin = this.registeredPlugins.find((plugin) => plugin.name === pluginName);
    if (!plugin) {
      this.log.error(`addDevice error: device ${dev}${device.name}${nf} plugin ${plg}${pluginName}${er} not found`);
      return;
    }

    // Add and register the device to the matterbridge in bridge mode
    if (this.bridgeMode === 'bridge') {
      const basic = device.getClusterServerById(BasicInformationCluster.id);
      if (!basic) {
        this.log.error(`addDevice error: cannot find the BasicInformationCluster device ${dev}${device.name}${nf} plugin ${plg}${pluginName}${nf}`);
        return;
      }
      device.createDefaultBridgedDeviceBasicInformationClusterServer(
        basic.getNodeLabelAttribute(),
        basic.getSerialNumberAttribute(),
        basic.getVendorIdAttribute(),
        basic.getVendorNameAttribute(),
        basic.getProductNameAttribute(),
        basic.getSoftwareVersionAttribute(),
        basic.getSoftwareVersionStringAttribute(),
        basic.getHardwareVersionAttribute(),
        basic.getHardwareVersionStringAttribute(),
      );
      //console.log(basic.getSoftwareVersionAttribute(), basic.getSoftwareVersionStringAttribute());
      this.matterAggregator.addBridgedDevice(device);
      this.registeredDevices.push({ plugin: pluginName, device, added: true });
      this.log.info(`Added and registered device ${dev}${device.name}${nf} for plugin ${plg}${pluginName}${nf}`);
    }

    // Only register the device in childbridge mode
    if (this.bridgeMode === 'childbridge') {
      this.registeredDevices.push({ plugin: pluginName, device, added: false });
      this.log.info(`Registered device ${dev}${device.name}${nf} for plugin ${plg}${pluginName}${nf}`);
    }
  }

  async addBridgedDevice(pluginName: string, device: MatterbridgeDevice) {
    this.log.info(`Adding bridged device ${dev}${device.name}${nf} for plugin ${plg}${pluginName}${nf}`);

    // Check if the plugin is registered
    const plugin = this.registeredPlugins.find((plugin) => plugin.name === pluginName);
    if (!plugin) {
      this.log.error(`addBridgedDevice error: device ${dev}${device.name}${nf} plugin ${plg}${pluginName}${er} not found`);
      return;
    }

    // Add and register the device to the matterbridge in bridge mode
    if (this.bridgeMode === 'bridge') {
      this.matterAggregator.addBridgedDevice(device);
      this.registeredDevices.push({ plugin: pluginName, device, added: true });
      this.log.info(`Added and registered bridged device ${dev}${device.name}${nf} for plugin ${plg}${pluginName}${nf}`);
    }

    // Only register the device in childbridge mode
    if (this.bridgeMode === 'childbridge') {
      this.registeredDevices.push({ plugin: pluginName, device, added: false });
      this.log.info(`Registered bridged device ${dev}${device.name}${nf} for plugin ${plg}${pluginName}${nf}`);

      //const basic = device.getClusterServerById(BridgedDeviceBasicInformationCluster.id);
      //console.log(JSON.stringify(basic, null, 2));
    }
  }

  private async startStorage(storageType: string, storageName: string) {
    if (!storageName.endsWith('.json')) {
      storageName += '.json';
    }
    this.log.debug(`Starting storage ${storageType} ${storageName}`);
    if (storageType === 'disk') {
      const storageDisk = new StorageBackendDisk(storageName);
      this.storageManager = new StorageManager(storageDisk);
    }
    if (storageType === 'json') {
      const storageJson = new StorageBackendJsonFile(storageName);
      this.storageManager = new StorageManager(storageJson);
    }
    try {
      await this.storageManager.initialize();
      this.log.debug('Storage initialized');
      if (storageType === 'json') {
        await this.backupJsonStorage(storageName, storageName.replace('.json', '') + '.backup.json');
      }
    } catch (error) {
      this.log.error('Storage initialize() error!');
      process.exit(1);
    }
  }

  private async backupJsonStorage(storageName: string, backupName: string) {
    try {
      this.log.debug(`Making backup copy of ${storageName}`);
      await fs.copyFile(storageName, backupName);
      this.log.debug(`Successfully backed up ${storageName} to ${backupName}`);
    } catch (err) {
      if (err instanceof Error && 'code' in err) {
        if (err.code === 'ENOENT') {
          this.log.info(`No existing file to back up for ${storageName}. This is expected on the first run.`);
        } else {
          this.log.error(`Error making backup copy of ${storageName}: ${err.message}`);
        }
      } else {
        this.log.error(`An unexpected error occurred during the backup of ${storageName}: ${String(err)}`);
      }
    }
  }

  private async stopStorage() {
    this.log.debug('Stopping storage');
    await this.storageManager?.close();
    this.log.debug('Storage closed');
  }

  private async startMatterBridge() {
    this.log.debug('Starting matterbridge in mode', this.bridgeMode);
    await this.createMatterServer(this.storageManager);

    if (this.bridgeMode === 'bridge') {
      // Plugins are loaded by loadPlugin on startup and plugin.loaded is set to true
      // Plugins are started by callback when Matterbridge is commissioned and plugin.started is set to true
      this.log.debug('Creating commissioning server context for Matterbridge');
      this.matterbridgeContext = await this.createCommissioningServerContext('Matterbridge', 'Matterbridge', DeviceTypes.AGGREGATOR.code, 0xfff1, 'Matterbridge', 0x8000, 'Matterbridge aggragator');
      this.log.debug('Creating commissioning server for Matterbridge');
      this.commissioningServer = await this.createCommisioningServer(this.matterbridgeContext, 'Matterbridge');
      this.log.debug('Creating matter aggregator for matterbridge');
      this.matterAggregator = await this.createMatterAggregator(this.matterbridgeContext);
      this.log.debug('Adding matterbridge aggregator to matterbridge commissioning server');
      this.commissioningServer.addDevice(this.matterAggregator);
      this.log.debug('Adding matterbridge commissioning server to matter server');
      this.matterServer.addCommissioningServer(this.commissioningServer, { uniqueStorageKey: 'Matterbridge' });
      this.log.debug('Starting matter server');
      await this.matterServer.start();
      this.log.debug('Started matter server');
      this.showCommissioningQRCode(this.commissioningServer, this.matterbridgeContext, 'Matterbridge');
    }

    if (this.bridgeMode === 'childbridge') {
      // Plugins are loaded by loadPlugin on startup and plugin.loaded is set to true
      // Plugins are started here and plugin.started is set to true.
      // addDevice and addBridgedDeevice just register the devices that are added here to the plugin commissioning server for Accessory Platform
      // or to the plugin aggregator for Dynamic Platform after the commissioning is done
      this.registeredPlugins.forEach(async (plugin) => {
        if (!plugin.enabled) return;
        // Start the interval to check if the plugin is loaded
        const loadedInterval = setInterval(async () => {
          this.log.debug(`Waiting in load interval for plugin ${plg}${plugin.name}${db} to load (${plugin.loaded}) and start (${plugin.started}) and send devices ...`);
          if (!plugin.loaded) return;
          plugin.started = true;
          plugin.registeredDevices = 0;
          clearInterval(loadedInterval);
        }, 1000);

        // Start the interval to check if the plugins is started
        const startedInterval = setInterval(async () => {
          this.log.debug(`Waiting in started interval for plugin ${plg}${plugin.name}${db} to load (${plugin.loaded}) and start (${plugin.started}) and send devices ...`);
          if (!plugin.started) return;
          if (plugin.type === 'AccessoryPlatform') {
            this.log.debug(`Starting accessory platform for plugin ${plg}${plugin.name}${db}`);
            if (plugin.platform) await plugin.platform.onStart('Matterbridge Accessory platform has started commissioning');
            else this.log.error(`Platform not found for plugin ${plg}${plugin.name}${er}`);
            this.registeredDevices.forEach(async (registeredDevice) => {
              if (registeredDevice.plugin === plugin.name) {
                plugin.storageContext = await this.importCommissioningServerContext(plugin.name, registeredDevice.device); // Generate serialNumber and uniqueId
                this.log.debug(`Creating commissioning server for plugin ${plg}${plugin.name}${db}`);
                plugin.commissioningServer = await this.createCommisioningServer(plugin.storageContext, plugin.name);
                this.log.debug(`Adding device ${registeredDevice.device.name} to the commissioning server for plugin ${plg}${plugin.name}${db}`);
                plugin.commissioningServer.addDevice(registeredDevice.device);
                if (plugin.registeredDevices !== undefined) plugin.registeredDevices++;
                this.matterServer.addCommissioningServer(plugin.commissioningServer, { uniqueStorageKey: plugin.name });
                return;
              }
            });
          }
          if (plugin.type === 'DynamicPlatform') {
            plugin.storageContext = await this.createCommissioningServerContext(
              // Generate serialNumber and uniqueId
              plugin.name,
              'Matterbridge Dynamic Platform',
              DeviceTypes.AGGREGATOR.code,
              0xfff1,
              'Matterbridge',
              0x8000,
              'Dynamic Platform',
            );
            this.log.debug(`Creating commissioning server for plugin ${plg}${plugin.name}${db}`);
            plugin.commissioningServer = await this.createCommisioningServer(plugin.storageContext, plugin.name);
            this.log.debug(`Creating aggregator for plugin ${plg}${plugin.name}${db}`);
            plugin.aggregator = await this.createMatterAggregator(plugin.storageContext); // Generate serialNumber and uniqueId
            this.log.debug(`Starting dynamic platform for plugin ${plg}${plugin.name}${db}`);
            if (plugin.platform) await plugin.platform.onStart('Matterbridge Dynamic platform has started commissioning');
            else this.log.error(`Platform not found for plugin ${plg}${plugin.name}${er}`);
            this.log.debug(`Adding matter aggregator to commissioning server for plugin ${plg}${plugin.name}${db}`);
            plugin.commissioningServer.addDevice(plugin.aggregator);
            this.matterServer.addCommissioningServer(plugin.commissioningServer, { uniqueStorageKey: plugin.name });
          }
          clearInterval(startedInterval);
        }, 1000);
      });

      // Start the interval to check if all plugins are loaded and started and so start the matter server
      const startMatterInterval = setInterval(async () => {
        let allStarted = true;
        this.registeredPlugins.forEach(async (plugin) => {
          this.log.debug(`Waiting in start matter server interval for plugin ${plg}${plugin.name}${db} to load (${plugin.loaded}) and start (${plugin.started}) and send devices ...`);
          if (plugin.enabled && (!plugin.loaded || !plugin.started)) allStarted = false;
        });
        if (!allStarted) return;
        // Setting reachability to true
        this.log.debug('Setting reachability to true for all plugins and devices');
        this.registeredPlugins.forEach((plugin) => {
          this.log.debug(`Setting reachability to true for ${plg}${plugin.name}${db}`);
          plugin.commissioningServer?.setReachability(true);
          this.registeredDevices.forEach(async (registeredDevice) => {
            if (registeredDevice.plugin === plugin.name) {
              if (plugin.type === 'AccessoryPlatform') this.setReachableAttribute(registeredDevice.device, true);
              if (plugin.type === 'DynamicPlatform') registeredDevice.device.setBridgedDeviceReachability(true);
            }
          });
        });
        this.log.debug('Starting matter server from startMatter interval');
        await this.matterServer.start();
        this.log.debug('Started matter server from startMatter interval');
        this.registeredPlugins.forEach(async (plugin) => {
          this.showCommissioningQRCode(plugin.commissioningServer, plugin.storageContext, plugin.name);
        });
        Logger.defaultLogLevel = Level.DEBUG;
        clearInterval(startMatterInterval);
      }, 1000);
      return;
    }
  }

  private async importCommissioningServerContext(pluginName: string, device: MatterbridgeDevice) {
    const basic = device.getClusterServer(BasicInformationCluster);
    if (!basic) {
      throw new Error('importCommissioningServerContext error: cannot find the BasicInformationCluster');
    }
    //const random = 'CS' + CryptoNode.getRandomData(8).toHex();
    return this.createCommissioningServerContext(
      pluginName,
      basic.getNodeLabelAttribute(),
      DeviceTypeId(device.deviceType),
      basic.getVendorIdAttribute(),
      basic.getVendorNameAttribute(),
      basic.getProductIdAttribute(),
      basic.getProductNameAttribute(),
      basic.attributes.serialNumber?.getLocal(),
      basic.attributes.uniqueId?.getLocal(),
      basic.attributes.softwareVersion?.getLocal(),
      basic.attributes.softwareVersionString?.getLocal(),
      basic.attributes.hardwareVersion?.getLocal(),
      basic.attributes.hardwareVersionString?.getLocal(),
    );
  }

  private async createCommissioningServerContext(
    pluginName: string,
    deviceName: string,
    deviceType: DeviceTypeId,
    vendorId: number,
    vendorName: string,
    productId: number,
    productName: string,
    serialNumber?: string,
    uniqueId?: string,
    softwareVersion?: number,
    softwareVersionString?: string,
    hardwareVersion?: number,
    hardwareVersionString?: string,
  ) {
    this.log.debug(`Creating commissioning server storage context for ${plg}${pluginName}${db}`);
    const random = 'CS' + CryptoNode.getRandomData(8).toHex();
    const storageContext = this.storageManager.createContext(pluginName);
    storageContext.set('deviceName', deviceName);
    storageContext.set('deviceType', deviceType);
    storageContext.set('vendorId', vendorId);
    storageContext.set('vendorName', vendorName.slice(0, 32));
    storageContext.set('productId', productId);
    storageContext.set('productName', productName.slice(0, 32));
    storageContext.set('nodeLabel', productName.slice(0, 32));
    storageContext.set('productLabel', productName.slice(0, 32));
    //storageContext.set('serialNumber', serialNumber ? serialNumber : storageContext.get('serialNumber', random));
    //storageContext.set('uniqueId', uniqueId ? uniqueId : storageContext.get('uniqueId', random));
    storageContext.set('serialNumber', storageContext.get('serialNumber', random));
    storageContext.set('uniqueId', storageContext.get('uniqueId', random));
    storageContext.set('softwareVersion', softwareVersion ?? 1);
    storageContext.set('softwareVersionString', softwareVersionString ?? '1.0.0');
    storageContext.set('hardwareVersion', hardwareVersion ?? 1);
    storageContext.set('hardwareVersionString', hardwareVersionString ?? '1.0.0');
    return storageContext;
  }

  private async showCommissioningQRCode(commissioningServer?: CommissioningServer, storageContext?: StorageContext, name?: string) {
    if (!commissioningServer || !storageContext || !name) return;
    if (!commissioningServer.isCommissioned()) {
      this.log.info(`***The commissioning server for ${plg}${name}${nf} is not commissioned. Pair it scanning the QR code...`);
      const { qrPairingCode, manualPairingCode } = commissioningServer.getPairingCode();
      storageContext.set('qrPairingCode', qrPairingCode);
      storageContext.set('manualPairingCode', manualPairingCode);
      const QrCode = new QrCodeSchema();
      this.log.debug(`Pairing code\n\n${QrCode.encode(qrPairingCode)}\nManual pairing code: ${manualPairingCode}\n`);
    } else {
      this.log.info(`***The commissioning server for ${plg}${name}${nf} is already commissioned. Waiting for controllers to connect ...`);
      if (this.bridgeMode === 'childbridge') {
        const plugin = this.findPlugin(name);
        if (plugin) plugin.paired = true;
      }
    }
  }

  private findPlugin(pluginName: string) {
    const plugin = this.registeredPlugins.find((registeredPlugin) => registeredPlugin.name === pluginName);
    if (!plugin) {
      this.log.error(`Plugin ${plg}${pluginName}${er} not found`);
      return;
    }
    return plugin;
  }

  private async createCommisioningServer(context: StorageContext, name: string) {
    this.log.debug(`Creating matter commissioning server for ${plg}${name}${db}`);
    const deviceName = context.get('deviceName') as string;
    const deviceType = context.get('deviceType') as DeviceTypeId;

    const vendorId = context.get('vendorId') as number;
    const vendorName = context.get('vendorName') as string; // Home app = Manufacturer

    const productId = context.get('productId') as number;
    const productName = context.get('productName') as string; // Home app = Model

    const serialNumber = context.get('serialNumber') as string;
    const uniqueId = context.get('uniqueId') as string;

    this.log.debug(
      // eslint-disable-next-line max-len
      `Creating matter commissioning server for ${plg}${name}${db} with deviceName ${deviceName} deviceType ${deviceType}(0x${deviceType.toString(16).padStart(4, '0')}) uniqueId ${uniqueId} serialNumber ${serialNumber}`,
    );
    const commissioningServer = new CommissioningServer({
      port: undefined,
      passcode: undefined,
      discriminator: undefined,
      deviceName,
      deviceType,
      basicInformation: {
        vendorId: VendorId(vendorId),
        vendorName,
        productId,
        productName,
        nodeLabel: productName,
        productLabel: productName,
        softwareVersion: context.get('softwareVersion', 1),
        softwareVersionString: context.get('softwareVersionString', '1.0.0'), // Home app = Firmware Revision
        hardwareVersion: context.get('hardwareVersion', 1),
        hardwareVersionString: context.get('hardwareVersionString', '1.0.0'),
        uniqueId,
        serialNumber,
        reachable: true,
      },
      activeSessionsChangedCallback: (fabricIndex) => {
        const info = commissioningServer.getActiveSessionInformation(fabricIndex);
        this.log.debug(`***Active sessions changed on fabric ${fabricIndex} for ${plg}${name}${nf}`, debugStringify(info));
        if (info && info[0]?.isPeerActive === true && info[0]?.secure === true && info[0]?.numberOfActiveSubscriptions >= 1) {
          this.log.info(`***Controller connected to ${plg}${name}${nf} ready to start...`);
          if (this.bridgeMode === 'childbridge') {
            const plugin = this.findPlugin(name);
            if (plugin) {
              if (plugin.connected === true) return; // Only once cause the devices are already added to the plugins aggregator
              plugin.connected = true;
            }
          }

          setTimeout(() => {
            if (this.bridgeMode === 'bridge') {
              //Logger.defaultLogLevel = Level.INFO;
              this.registeredPlugins.forEach(async (plugin) => {
                if (!plugin.enabled) return;
                if (plugin.platform && !plugin.started) {
                  this.log.info(`***Starting plugin ${plg}${plugin.name}${nf}`);
                  await plugin.platform.onStart('Matterbridge is commissioned and controllers are connected');
                  plugin.started = true;
                  this.log.info(`***Started plugin ${plg}${plugin.name}${nf}`);
                } else {
                  this.log.error(`***Platform not found for plugin ${plg}${plugin.name}${er}`);
                }
              });
              Logger.defaultLogLevel = Level.DEBUG;
            }
            if (this.bridgeMode === 'childbridge') {
              //Logger.defaultLogLevel = Level.INFO;
              const plugin = this.findPlugin(name);
              if (!plugin || plugin.type === 'AccessoryPlatform') return;
              this.registeredDevices.forEach(async (registeredDevice) => {
                if (registeredDevice.plugin !== name) return;
                this.log.debug(`***Adding device ${registeredDevice.device.name} to aggregator for plugin ${plg}${plugin.name}${db}`);
                if (!plugin.aggregator) {
                  this.log.error(`***Aggregator not found for plugin ${plg}${plugin.name}${er}`);
                  return;
                }
                plugin.aggregator.addBridgedDevice(registeredDevice.device);
                if (plugin.registeredDevices !== undefined) plugin.registeredDevices++;
                registeredDevice.added = true;
              });
              Logger.defaultLogLevel = Level.DEBUG;
            }
            //logEndpoint(commissioningServer.getRootEndpoint());
          }, 2000);
        }
      },
      commissioningChangedCallback: (fabricIndex) => {
        const info = commissioningServer.getCommissionedFabricInformation(fabricIndex);
        this.log.debug(`***Commissioning changed on fabric ${fabricIndex} for ${plg}${name}${nf}`, debugStringify(info));
        if (info.length === 0) {
          this.log.warn(`***Commissioning removed from fabric ${fabricIndex} for ${plg}${name}${nf}`);
        }
      },
    });
    commissioningServer.addCommandHandler('testEventTrigger', async ({ request: { enableKey, eventTrigger } }) =>
      this.log.info(`testEventTrigger called on GeneralDiagnostic cluster: ${enableKey} ${eventTrigger}`),
    );
    return commissioningServer;
  }

  private async createMatterServer(storageManager: StorageManager) {
    this.log.debug('Creating matter server');
    this.matterServer = new MatterServer(storageManager, { mdnsAnnounceInterface: undefined });
  }

  private async createMatterAggregator(context: StorageContext) {
    const random = 'AG' + CryptoNode.getRandomData(8).toHex();
    context.set('aggregatorSerialNumber', context.get('aggregatorSerialNumber', random));
    context.set('aggregatorUniqueId', context.get('aggregatorUniqueId', random));

    const matterAggregator = new Aggregator();
    matterAggregator.addClusterServer(
      ClusterServer(
        BasicInformationCluster,
        {
          dataModelRevision: 1,
          location: 'XX',
          vendorId: VendorId(0xfff1),
          vendorName: 'Matterbridge',
          productId: 0x8000,
          productName: 'Matterbridge aggregator',
          productLabel: 'Matterbridge aggregator',
          nodeLabel: 'Matterbridge aggregator',
          serialNumber: context.get<string>('aggregatorSerialNumber'),
          uniqueId: context.get<string>('aggregatorUniqueId'),
          softwareVersion: 1,
          softwareVersionString: 'v.1.0',
          hardwareVersion: 1,
          hardwareVersionString: 'v.1.0',
          reachable: true,
          capabilityMinima: { caseSessionsPerFabric: 3, subscriptionsPerFabric: 3 },
        },
        {},
        {
          startUp: true,
          shutDown: true,
          leave: true,
          reachableChanged: true,
        },
      ),
    );
    return matterAggregator;
  }

  private async stopMatter() {
    this.log.debug('Stopping matter commissioningServer');
    await this.commissioningServer?.close();
    this.log.debug('Stopping matter commissioningController');
    await this.commissioningController?.close();
    this.log.debug('Stopping matter server');
    await this.matterServer?.close();
    this.log.debug('Matter server closed');
  }

  private async logNodeAndSystemInfo() {
    // IP address information
    const networkInterfaces = os.networkInterfaces();
    this.systemInformation.ipv4Address = 'Not found';
    this.systemInformation.ipv6Address = 'Not found';
    for (const interfaceDetails of Object.values(networkInterfaces)) {
      if (!interfaceDetails) {
        break;
      }
      for (const detail of interfaceDetails) {
        if (detail.family === 'IPv4' && !detail.internal && this.systemInformation.ipv4Address === 'Not found') {
          this.systemInformation.ipv4Address = detail.address;
        } else if (detail.family === 'IPv6' && !detail.internal && this.systemInformation.ipv6Address === 'Not found') {
          this.systemInformation.ipv6Address = detail.address;
        }
      }
      // Break if both addresses are found to improve efficiency
      if (this.systemInformation.ipv4Address !== 'Not found' && this.systemInformation.ipv6Address !== 'Not found') {
        break;
      }
    }

    // Node information
    this.systemInformation.nodeVersion = process.versions.node;
    const versionMajor = parseInt(this.systemInformation.nodeVersion.split('.')[0]);
    const versionMinor = parseInt(this.systemInformation.nodeVersion.split('.')[1]);
    const versionPatch = parseInt(this.systemInformation.nodeVersion.split('.')[2]);

    // Host system information
    this.systemInformation.hostname = os.hostname();
    this.systemInformation.osType = os.type(); // "Windows_NT", "Darwin", etc.
    this.systemInformation.osRelease = os.release(); // Kernel version
    this.systemInformation.osPlatform = os.platform(); // "win32", "linux", "darwin", etc.
    this.systemInformation.osArch = os.arch(); // "x64", "arm", etc.
    this.systemInformation.totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2) + ' GB'; // Convert to GB
    this.systemInformation.freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2) + ' GB'; // Convert to GB
    this.systemInformation.systemUptime = (os.uptime() / 60 / 60).toFixed(2) + ' hours'; // Convert to hours

    // Log the system information
    this.log.debug('Host System Information:');
    this.log.debug(`- Hostname: ${this.systemInformation.hostname}`);
    this.log.debug(`- IPv4 Address: ${this.systemInformation.ipv4Address}`);
    this.log.debug(`- IPv6 Address: ${this.systemInformation.ipv6Address}`);
    this.log.debug(`- Node.js: ${versionMajor}.${versionMinor}.${versionPatch}`);
    this.log.debug(`- OS Type: ${this.systemInformation.osType}`);
    this.log.debug(`- OS Release: ${this.systemInformation.osRelease}`);
    this.log.debug(`- Platform: ${this.systemInformation.osPlatform}`);
    this.log.debug(`- Architecture: ${this.systemInformation.osArch}`);
    this.log.debug(`- Total Memory: ${this.systemInformation.totalMemory}`);
    this.log.debug(`- Free Memory: ${this.systemInformation.freeMemory}`);
    this.log.debug(`- System Uptime: ${this.systemInformation.systemUptime}`);

    // Home directory
    this.homeDirectory = os.homedir();
    this.log.debug(`Home Directory: ${this.homeDirectory}`);

    // Package root directory
    const currentFileDirectory = path.dirname(fileURLToPath(import.meta.url));
    this.rootDirectory = path.resolve(currentFileDirectory, '../');
    this.log.debug(`Root Directory: ${this.rootDirectory}`);

    // Create the data directory .matterbridge in the home directory
    this.matterbridgeDirectory = path.join(this.homeDirectory, '.matterbridge');
    try {
      await fs.access(this.matterbridgeDirectory);
    } catch (err) {
      await fs.mkdir(this.matterbridgeDirectory);
    }
    this.log.debug(`Matterbridge Directory: ${this.matterbridgeDirectory}`);

    // Current working directory
    const currentDir = process.cwd();
    this.log.debug(`Current Working Directory: ${currentDir}`);

    // Command line arguments (excluding 'node' and the script name)
    const cmdArgs = process.argv.slice(2).join(' ');
    this.log.debug(`Command Line Arguments: ${cmdArgs}`);
  }

  /**
   * Initializes the frontend of Matterbridge.
   *
   * @param port The port number to run the frontend server on. Default is 3000.
   */
  async initializeFrontend(port: number = 3000): Promise<void> {
    this.log.debug(`Initializing the frontend on port ${YELLOW}${port}${db} static ${UNDERLINE}${path.join(this.rootDirectory, 'frontend/build')}${rs}`);
    this.app = express();

    // Serve React build directory
    this.app.use(express.static(path.join(this.rootDirectory, 'frontend/build')));

    // Endpoint to provide QR pairing code
    this.app.get('/api/qr-code', (req, res) => {
      this.log.debug('The frontend sent /api/qr-code');
      if (this.bridgeMode === 'childbridge') {
        this.log.debug('qrPairingCode for /api/qr-code not available in childbridge mode');
        res.json({});
        return;
      }
      try {
        const qrData = { qrPairingCode: this.matterbridgeContext.get('qrPairingCode'), manualPairingCode: this.matterbridgeContext.get('manualPairingCode') };
        res.json(qrData);
      } catch (error) {
        this.log.error('qrPairingCode for /api/qr-code not found');
        res.json({});
      }
    });

    // Endpoint to provide system information
    this.app.get('/api/system-info', (req, res) => {
      this.log.debug('The frontend sent /api/system-info');
      res.json(this.systemInformation);
    });

    // Endpoint to provide plugins
    /*
    this.app.get('/api/plugins', (req, res) => {
      this.log.debug('The frontend sent /api/plugins');
      const data: { name: string; description: string; version: string; author: string; type: string; devices: number; status: boolean }[] = [];
      this.registeredPlugins.forEach((plugin) => {
        let count = 0;
        this.registeredDevices.forEach(async (registeredDevice) => {
          if (registeredDevice.plugin === plugin.name) count++;
        });
        data.push({ name: plugin.name, description: plugin.description, version: plugin.version, author: plugin.author, type: plugin.type, devices: count, status: plugin.enabled! });
      });
      res.json(data);
    });
    */

    // Endpoint to provide plugins
    this.app.get('/api/plugins', (req, res) => {
      this.log.debug('The frontend sent /api/plugins');
      const baseRegisteredPlugins: BaseRegisteredPlugin[] = this.registeredPlugins.map((plugin) => ({
        path: plugin.path,
        type: plugin.type,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        loaded: plugin.loaded,
        started: plugin.started,
        enabled: plugin.enabled,
        paired: plugin.paired,
        connected: plugin.connected,
        registeredDevices: plugin.registeredDevices,
      }));
      //baseRegisteredPlugins.forEach((plugin) => {
      //plugin.registeredDevices = this.registeredDevices.filter((registeredDevice) => registeredDevice.plugin === plugin.name).length;
      //});
      res.json(baseRegisteredPlugins);
    });

    // Endpoint to provide devices
    this.app.get('/api/devices', (req, res) => {
      this.log.debug('The frontend sent /api/devices');
      const data: { pluginName: string; type: string; endpoint: EndpointNumber | undefined; name: string; serial: string; uniqueId: string; cluster: string }[] = [];
      this.registeredDevices.forEach((registeredDevice) => {
        let name = registeredDevice.device.getClusterServer(BasicInformationCluster)?.attributes.nodeLabel?.getLocal();
        if (!name) name = registeredDevice.device.getClusterServer(BridgedDeviceBasicInformationCluster)?.attributes.nodeLabel?.getLocal() ?? 'Unknown';
        let serial = registeredDevice.device.getClusterServer(BasicInformationCluster)?.attributes.serialNumber?.getLocal();
        if (!serial) serial = registeredDevice.device.getClusterServer(BridgedDeviceBasicInformationCluster)?.attributes.serialNumber?.getLocal() ?? 'Unknown';
        let uniqueId = registeredDevice.device.getClusterServer(BasicInformationCluster)?.attributes.uniqueId?.getLocal();
        if (!uniqueId) uniqueId = registeredDevice.device.getClusterServer(BridgedDeviceBasicInformationCluster)?.attributes.uniqueId?.getLocal() ?? 'Unknown';
        const cluster = this.getClusterTextFromDevice(registeredDevice.device);
        data.push({
          pluginName: registeredDevice.plugin,
          type: registeredDevice.device.name + ' (0x' + registeredDevice.device.deviceType.toString(16).padStart(4, '0') + ')',
          endpoint: registeredDevice.device.id,
          name,
          serial,
          uniqueId,
          cluster: cluster,
        });
      });
      res.json(data);
    });

    // Endpoint to provide the cluster servers of the devices
    this.app.get('/api/devices_clusters/:selectedPluginName', (req, res) => {
      const selectedPluginName = req.params.selectedPluginName;
      this.log.debug('The frontend sent /api/devices_clusters', selectedPluginName);
      if (selectedPluginName === 'none') {
        res.json([]);
        return;
      }
      const data: { clusterName: string; clusterId: string; attributeName: string; attributeId: string; attributeValue: string }[] = [];
      this.registeredDevices.forEach((registeredDevice) => {
        if (registeredDevice.plugin === selectedPluginName) {
          const clusterServers = registeredDevice.device.getAllClusterServers();
          clusterServers.forEach((clusterServer) => {
            Object.entries(clusterServer.attributes).forEach(([key, value]) => {
              if (clusterServer.name === 'EveHistory') return;
              //this.log.debug(`***--clusterServer: ${clusterServer.name}(${clusterServer.id}) attribute:${key}(${value.id}) ${value.isFixed} ${value.isWritable} ${value.isWritable}`);
              let attributeValue;
              try {
                if (typeof value.getLocal() === 'object') attributeValue = stringify(value.getLocal());
                else attributeValue = value.getLocal().toString();
              } catch (error) {
                attributeValue = 'Unavailable';
                this.log.debug(`****${error} in clusterServer: ${clusterServer.name}(${clusterServer.id}) attribute: ${key}(${value.id})`);
                //console.log(error);
              }
              data.push({
                clusterName: clusterServer.name,
                clusterId: '0x' + clusterServer.id.toString(16).padStart(2, '0'),
                attributeName: key,
                attributeId: '0x' + value.id.toString(16).padStart(2, '0'),
                attributeValue,
              });
            });
          });
        }
      });
      res.json(data);
    });

    // Fallback for routing
    this.app.get('*', (req, res) => {
      this.log.warn('The frontend sent *', req.url);
      res.sendFile(path.join(this.rootDirectory, 'frontend/build/index.html'));
    });

    this.app.listen(port, () => {
      this.log.info(`The frontend is running on ${UNDERLINE}http://localhost:${port}${rs}`);
    });

    this.log.debug(`Frontend initialized on port ${YELLOW}${port}${db} static ${UNDERLINE}${path.join(this.rootDirectory, 'frontend/build')}${rs}`);
  }

  getClusterTextFromDevice(device: MatterbridgeDevice) {
    let attributes = '';
    //this.log.debug(`getClusterTextFromDevice: ${device.name}`);
    const clusterServers = device.getAllClusterServers();
    clusterServers.forEach((clusterServer) => {
      //this.log.debug(`***--clusterServer: ${clusterServer.id} (${clusterServer.name})`);
      if (clusterServer.name === 'OnOff') attributes += `OnOff: ${clusterServer.getOnOffAttribute()} `;
      if (clusterServer.name === 'Switch') attributes += `Position: ${clusterServer.getCurrentPositionAttribute()} `;
      if (clusterServer.name === 'WindowCovering') attributes += `Cover position: ${clusterServer.attributes.currentPositionLiftPercent100ths.getLocal() / 100}% `;
      if (clusterServer.name === 'LevelControl') attributes += `Level: ${clusterServer.getCurrentLevelAttribute()}% `;
      if (clusterServer.name === 'ColorControl') attributes += `Hue: ${clusterServer.getCurrentHueAttribute()} Saturation: ${clusterServer.getCurrentSaturationAttribute()}% `;
      if (clusterServer.name === 'BooleanState') attributes += `Contact: ${clusterServer.getStateValueAttribute()} `;
      if (clusterServer.name === 'OccupancySensing') attributes += `Occupancy: ${clusterServer.getOccupancyAttribute().occupied} `;
      if (clusterServer.name === 'IlluminanceMeasurement') attributes += `Illuminance: ${clusterServer.getMeasuredValueAttribute()} `;
      if (clusterServer.name === 'AirQuality') attributes += `Air quality: ${clusterServer.getAirQualityAttribute()} `;
      if (clusterServer.name === 'TemperatureMeasurement') attributes += `Temperature: ${clusterServer.getMeasuredValueAttribute() / 100}°C `;
      if (clusterServer.name === 'RelativeHumidityMeasurement') attributes += `Humidity: ${clusterServer.getMeasuredValueAttribute() / 100}% `;
      if (clusterServer.name === 'PressureMeasurement') attributes += `Pressure: ${clusterServer.getMeasuredValueAttribute()} `;
    });
    return attributes;
  }
}

/*
npx create-react-app matterbridge-frontend
cd matterbridge-frontend
npm install react-router-dom 

Success! Created frontend at C:\Users\lligu\OneDrive\GitHub\matterbridge\frontend
Inside that directory, you can run several commands:

  npm start
    Starts the development server.

  npm run build
    Bundles the app into static files for production.

  npm test
    Starts the test runner.

  npm run eject
    Removes this tool and copies build dependencies, configuration files
    and scripts into the app directory. If you do this, you can’t go back!

We suggest that you begin by typing:

  cd frontend
  npm start

Happy hacking!
PS C:\Users\lligu\OneDrive\GitHub\matterbridge> cd frontend
PS C:\Users\lligu\OneDrive\GitHub\matterbridge\frontend> npm run build

> frontend@0.1.0 build
> react-scripts build

Creating an optimized production build...
One of your dependencies, babel-preset-react-app, is importing the
"@babel/plugin-proposal-private-property-in-object" package without
declaring it in its dependencies. This is currently working because
"@babel/plugin-proposal-private-property-in-object" is already in your
node_modules folder for unrelated reasons, but it may break at any time.

babel-preset-react-app is part of the create-react-app project, which
is not maintianed anymore. It is thus unlikely that this bug will
ever be fixed. Add "@babel/plugin-proposal-private-property-in-object" to
your devDependencies to work around this error. This will make this message
go away.

Compiled successfully.

File sizes after gzip:

  46.65 kB  build\static\js\main.9b7ec296.js
  1.77 kB   build\static\js\453.8ab44547.chunk.js
  513 B     build\static\css\main.f855e6bc.css

The project was built assuming it is hosted at /.
You can control this with the homepage field in your package.json.

The build folder is ready to be deployed.
You may serve it with a static server:

  npm install -g serve
  serve -s build

Find out more about deployment here:

  https://cra.link/deployment

PS C:\Users\lligu\OneDrive\GitHub\matterbridge\frontend> 
*/

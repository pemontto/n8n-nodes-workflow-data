import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
	NodeOperationError
} from 'n8n-workflow';

import { get, merge, set, unset } from 'lodash';

export class WorkflowData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Workflow Data',
		name: 'workflowData',
		group: ['transform'],
		version: 1,
		description: 'Read and write workflow static data',
		defaults: {
			name: 'Workflow Data',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete workflow data',
						action: 'Delete workflow data',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get workflow data',
						action: 'Get workflow data',
					},
					{
						name: 'Set',
						value: 'set',
						description: 'Set workflow data',
						action: 'Set workflow data',
					},
				],
				default: 'set',
			},
			////////////////////////////
			//
			// Delete
			//
			////////////////////////////
			{
				displayName: 'Delete All',
				name: 'deleteAll',
				type: 'boolean',
				description: 'Whether to delete all workflow data',
				default: false,
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
					},
				},
			},
			{
				displayName: 'Values to Delete',
				name: 'values',
				placeholder: 'Add Value to Delete',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						deleteAll: [
							false,
						],
					},
				},
				default: {},
				options: [
					{
						name: 'value',
						displayName: 'Delete Value',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: 'propertyName',
								description:
									'Name of the property to delete. Supports dot-notation. Example: "data.person[0].name"',
							},
						],
					},
				],
			},
			////////////////////////////
			//
			// Get
			//
			////////////////////////////
			{
				displayName: 'Get All',
				name: 'getAll',
				type: 'boolean',
				description: 'Whether to get all workflow data',
				default: false,
				displayOptions: {
					show: {
						operation: [
							'get',
						],
					},
				},
			},
			{
				displayName: 'Values to Get',
				name: 'values',
				placeholder: 'Add Value to Get',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						getAll: [
							false,
						],
					},
				},
				default: {},
				options: [
					{
						name: 'value',
						displayName: 'Value to Get',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: 'propertyName',
								description:
									'Name of the property to get. Supports dot-notation. Example: "data.person[0].name"',
							},
						],
					},
				],
			},
			////////////////////////////
			//
			// Set
			//
			////////////////////////////
			{
				displayName: 'Raw JSON',
				name: 'rawJSON',
				type: 'boolean',
				description: 'Whether to use raw JSON to merge with existing workflow data',
				default: false,
				displayOptions: {
					show: {
						operation: [
							'set',
						],
					},
				},
			},
			{
				displayName: 'JSON Data',
				name: 'jsonData',
				type: 'string',
				description: 'JSON to merge with existing workflow data',
				default: '{}',
				displayOptions: {
					show: {
						operation: [
							'set',
						],
						rawJSON: [
							true,
						],
					},
				},
			},
			{
				displayName: 'Values to Set',
				name: 'values',
				placeholder: 'Add Value to Set',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				displayOptions: {
					show: {
						operation: [
							'set',
						],
						rawJSON: [
							false,
						],
					},
				},
				default: {},
				options: [
					{
						name: 'data',
						displayName: 'Add Data',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								default: 'propertyName',
								description:
									'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to write in the property',
							},
						],
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					hide: {
						deleteAll: [true],
						rawJSON: [true],
						getAll: [true],
					},
				},
				options: [
					{
						displayName: 'Dot Notation',
						name: 'dotNotation',
						type: 'boolean',
						default: true,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'<p>By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }.<p></p>If that is not intended this can be deactivated, it will then set { "a.b": value } instead.</p>.',
					},
				],
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as string;
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;

		console.log(`options: ${JSON.stringify(options, null, 2)}`);

		let workflowData = this.getWorkflowStaticData('global') as IDataObject;

		// Copy the whole JSON data as data on any level can be renamed
		const newItem: INodeExecutionData = {
			json: {},
			pairedItem: {
				item: 0,
			},
		};

		if (operation === 'delete') {
			const deleteAll = this.getNodeParameter('deleteAll', 0, false);
			if (deleteAll) {
				newItem.json._result = `${Object.keys(workflowData).length} values deleted`;
				workflowData = {};
				return this.prepareOutputData([newItem]);
			}
			const values = this.getNodeParameter('values', 0, []);
			console.log(`values: ${JSON.stringify(values, null, 2)}`);
			(this.getNodeParameter('values.value', 0, []) as INodeParameters[]).forEach(
				(deleteItem) => {
					console.log(`deleteItem: ${JSON.stringify(deleteItem)}`);
					if (options.dotNotation === false) {
						console.log(`del: normal`);
						delete workflowData[deleteItem.key as string];
					} else {
						console.log(`del: dotNotation`);
						unset(workflowData, deleteItem.key as string);
					}
				},
			);
		} else if (operation === 'get') {
			const getAll = this.getNodeParameter('getAll', 0, false);
			if (getAll) {
				newItem.json = workflowData;
				return this.prepareOutputData([newItem]);
			}
			const values = this.getNodeParameter('values', 0, []);
			console.log(`values: ${JSON.stringify(values, null, 2)}`);
			(this.getNodeParameter('values.value', 0, []) as INodeParameters[]).forEach(
				(getItem) => {
					console.log(`getItem: ${JSON.stringify(getItem)}`);
					if (options.dotNotation === false) {
						console.log(`get: normal`);
						newItem.json[getItem.key as string] = workflowData[getItem.key as string];
					} else {
						console.log(`get: dotNotation`);
						set(newItem.json, getItem.key as string, get(workflowData, getItem.key as string));
					}
				},
			);
		} else if (operation === 'set') {
			const rawJSON = this.getNodeParameter('rawJSON', 0, false);
			if (rawJSON) {
				let jsonData = this.getNodeParameter('jsonData', 0, {});
				try {
					console.log('trying to parse JSON');
					jsonData = JSON.parse(jsonData as string);
				} catch {
					// OK treat as an object
					console.log(`JSON parse failed, merging: ${JSON.stringify(jsonData)} `);
				} finally {
					if (typeof jsonData === 'object') {
						workflowData = merge(workflowData, jsonData);
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`rawJSON could not be parsed`,
						);
					}
				}
				return this.prepareOutputData([newItem]);
			}
			const values = this.getNodeParameter('values', 0, []);
			console.log(`values: ${JSON.stringify(values, null, 2)}`);
			(this.getNodeParameter('values.data', 0, []) as INodeParameters[]).forEach(
				(setItem) => {
					console.log(`setItem: ${JSON.stringify(setItem)}`);
					if (options.dotNotation === false) {
						console.log(`set: normal`);
						workflowData[setItem.key as string] = setItem.value;
					} else {
						console.log(`set: dotNotation`);
						set(workflowData, setItem.key as string, setItem.value);
						console.log(`GET: ${get(workflowData, setItem.key as string)}`);
						console.log(`set: ${setItem.key} = ${setItem.value}`);
					}
				},
			);
		}

		return this.prepareOutputData([newItem]);
	}
}

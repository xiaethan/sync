/**
 * Processing Pipeline
 * Bridges TypeScript and Python modules for QC and Aggregation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';
import { QCOutput, AggregatedResult, ChannelMessages } from '../types/message.js';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export class ProcessingPipeline {
  private dataDir: string;
  private pythonPath: string;

  constructor(dataDir: string = './data/processing', pythonPath: string = 'python3') {
    this.dataDir = dataDir;
    this.pythonPath = pythonPath;
  }

  /**
   * Run QC and Aggregation pipeline
   */
  async process(channelMessages: ChannelMessages): Promise<{
    qcOutput: QCOutput;
    aggregatedResult: AggregatedResult;
  }> {
    const sessionId = uuidv4();
    const qcInputPath = join(this.dataDir, `qc_input_${sessionId}.json`);
    const qcOutputPath = join(this.dataDir, `qc_output_${sessionId}.json`);
    const aggOutputPath = join(this.dataDir, `agg_output_${sessionId}.json`);

    // Prepare QC input format
    const qcInput = {
      channel_id: channelMessages.channel_id,
      messages: channelMessages.messages.map(msg => ({
        user_id: msg.user_id,
        user_name: msg.user_name,
        raw_message: msg.raw_message,
        parsed_slots: msg.parsed_slots,
        parsed_locations: msg.parsed_locations,
      })),
    };

    // Write QC input
    await writeFile(qcInputPath, JSON.stringify(qcInput, null, 2));

    // Run QC
    const qcScript = join(process.cwd(), 'src/qc/quality_control.py');
    await execAsync(`${this.pythonPath} ${qcScript} ${qcInputPath} ${qcOutputPath}`);

    // Read QC output
    const qcOutputContent = await readFile(qcOutputPath, 'utf-8');
    const qcOutput: QCOutput = JSON.parse(qcOutputContent);

    // Run Aggregation
    const aggScript = join(process.cwd(), 'src/aggregation/aggregate.py');
    await execAsync(`${this.pythonPath} ${aggScript} ${qcOutputPath} ${aggOutputPath}`);

    // Read Aggregation output
    const aggOutputContent = await readFile(aggOutputPath, 'utf-8');
    const aggregatedResult: AggregatedResult = JSON.parse(aggOutputContent);

    return {
      qcOutput,
      aggregatedResult,
    };
  }
}


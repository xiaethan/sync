/**
 * Processing Pipeline
 * Bridges TypeScript and Python modules for QC, then uses OpenAI LLM for Aggregation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';
import { QCOutput, AggregatedResult, ChannelMessages } from '../types/message.js';
import { v4 as uuidv4 } from 'uuid';
import { LLMAggregator } from './llmAggregator.js';

const execAsync = promisify(exec);

export class ProcessingPipeline {
  private dataDir: string;
  private pythonPath: string;
  private llmAggregator: LLMAggregator;

  constructor(dataDir: string = './data/processing', pythonPath: string = 'python3') {
    this.dataDir = dataDir;
    this.pythonPath = pythonPath;
    this.llmAggregator = new LLMAggregator();
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
    try {
      const { stdout, stderr } = await execAsync(`${this.pythonPath} ${qcScript} ${qcInputPath} ${qcOutputPath}`);
      if (stderr && !stderr.includes('WARNING')) {
        console.warn('QC script stderr:', stderr);
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const errorCode = error?.code;
      
      if (errorCode === 'ENOENT') {
        throw new Error(`Python not found. Make sure ${this.pythonPath} is installed and in your PATH.`);
      }
      
      if (error?.stderr) {
        throw new Error(`QC script failed: ${error.stderr}`);
      }
      
      throw new Error(`Failed to run QC script: ${errorMessage}`);
    }

    // Read QC output
    let qcOutputContent: string;
    try {
      qcOutputContent = await readFile(qcOutputPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read QC output file: ${qcOutputPath}. The QC script may have failed.`);
    }

    let qcOutput: QCOutput;
    try {
      qcOutput = JSON.parse(qcOutputContent);
    } catch (error) {
      throw new Error(`Failed to parse QC output JSON. File may be corrupted: ${qcOutputPath}`);
    }

    // Run LLM aggregation (replaces Python aggregation)
    const aggregatedResult = await this.llmAggregator.aggregate(qcOutput);

    return {
      qcOutput,
      aggregatedResult,
    };
  }
}


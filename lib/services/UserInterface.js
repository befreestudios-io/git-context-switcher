/**
 * User Interface service for Git Context Switcher
 */
import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import { Context } from '../models/Context.js';
import { validateContextName, validateEmail, validatePathPattern } from '../utils/security.js';

export class UserInterface {
  /**
   * Display a header with formatting
   * @param {string} title Header title
   */
  displayHeader(title) {
    console.log(chalk.blue('========================================'));
    console.log(chalk.blue(title));
    console.log(chalk.blue('========================================'));
  }
  
  /**
   * Display a success message
   * @param {string} message Message to display
   */
  displaySuccess(message) {
    console.log(chalk.green(`\n✅ ${message}`));
  }
  
  /**
   * Display an error message
   * @param {string} message Error message
   */
  displayError(message) {
    console.error(chalk.red(`\n❌ Error: ${message}`));
  }
  
  /**
   * Display a warning message
   * @param {string} message Warning message
   */
  displayWarning(message) {
    console.log(chalk.yellow(`\n⚠️ ${message}`));
  }
  
  /**
   * Display info about setup
   */
  displaySetupInfo() {
    console.log('\nLet\'s set up your Git contexts. For each context, you\'ll need to provide:');
    console.log('  - A name (e.g., "personal", "work")');
    console.log('  - A path pattern to match repositories for this context (e.g., "~/personal/**")');
    console.log('  - User details (name, email) for the context');
  }
  
  /**
   * Display configured contexts with beautiful formatting
   * @param {Array} contexts Array of context objects
   * @param {string} gitConfigDirPath Path to git config directory
   */
  displayContexts(contexts, gitConfigDirPath) {
    if (!contexts || contexts.length === 0) {
      return;
    }
    
    console.log(chalk.blue('\n📋 Your Git Context Configurations:'));
    console.log(chalk.blue('═════════════════════════════════════════════════'));
    
    for (let i = 0; i < contexts.length; i++) {
      const context = contexts[i];
      
      // Use different colors for alternating contexts for better readability
      const contextColor = i % 2 === 0 ? chalk.magenta : chalk.cyan;
      const nameColor = chalk.bold.white.bgHex(i % 2 === 0 ? '#6A0DAD' : '#0D6A9D');
      
      console.log(`\n${nameColor(` ${context.name.toUpperCase()} `)} ${contextColor('Context')}`);
      console.log(contextColor('─────────────────────────────────────────────────'));
      
      // User details with icons
      console.log(`${chalk.green('👤')} ${chalk.yellow('User Name:')}  ${chalk.white(context.userName)}`);
      console.log(`${chalk.green('📧')} ${chalk.yellow('User Email:')} ${chalk.white(context.userEmail)}`);
      
      // Path pattern with icon
      console.log(`${chalk.green('📂')} ${chalk.yellow('Path Pattern:')} ${chalk.white(context.pathPattern)}`);
      
      // GPG signing info if available
      if (context.signingKey) {
        console.log(`${chalk.green('🔑')} ${chalk.yellow('Signing Key:')} ${chalk.white(context.signingKey)}`);
        console.log(`${chalk.green('✍️')} ${chalk.yellow('Auto Sign:')}   ${context.autoSign ? chalk.green('Enabled') : chalk.red('Disabled')}`);
      }
      
      // Config file location
      const configPath = path.join(gitConfigDirPath, `${context.name}.gitconfig`);
      console.log(`${chalk.green('📄')} ${chalk.yellow('Config File:')} ${chalk.dim(configPath)}`);
      
      // Add instructions for testing
      if (i === contexts.length - 1) {
        console.log(chalk.blue('\n═════════════════════════════════════════════════'));
        console.log(`${chalk.green('💡')} ${chalk.white('To check which context applies to your current directory:')}`);
        console.log(`   ${chalk.cyan('Run:')} ${chalk.white('git-context apply')}`);
      }
    }
  }
  
  /**
   * Display simple list of contexts
   * @param {Array} contexts Array of context objects
   * @param {string} gitConfigDirPath Path to git config directory
   */
  displayContextsList(contexts, gitConfigDirPath) {
    if (!contexts || contexts.length === 0) {
      this.displayWarning('No contexts configured yet. Run setup to configure contexts.');
      return;
    }
    
    console.log(chalk.blue('Configured Git Contexts:'));
    console.log(chalk.blue('===================================='));
    
    for (const context of contexts) {
      console.log(chalk.green(`\n🔹 Context: ${chalk.bold(context.name)}`));
      console.log(`   Path Pattern: ${chalk.cyan(context.pathPattern)}`);
      console.log(`   Config File: ${chalk.cyan(path.join(gitConfigDirPath, `${context.name}.gitconfig`))}`);
    }
  }
  
  /**
   * Display active context information
   * @param {Object} context Matched context or null
   * @param {string} gitConfigDirPath Path to git config directory
   * @param {string} activeConfig Active git configuration
   */
  displayActiveContext(context, gitConfigDirPath, activeConfig) {
    if (context) {
      this.displaySuccess(`Current path matches context: ${chalk.bold(context.name)}`);
      console.log(chalk.green(`Using git config from: ${path.join(gitConfigDirPath, `${context.name}.gitconfig`)}`));
      
      console.log(chalk.dim('\nActive Git Configuration:'));
      console.log(chalk.dim('-----------------------------------'));
      console.log(chalk.dim(activeConfig));
    } else {
      this.displayWarning('Current directory does not match any configured context.');
      console.log(chalk.yellow('Using default git configuration.'));
    }
  }
  
  /**
   * Get a single context from user input
   * @returns {Promise<Context>} Created context
   */
  async getContextFromUser() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Context name (e.g., personal, work):',
        validate: input => {
          const trimmed = input.trim();
          if (trimmed === '') return 'Context name is required';
          if (!validateContextName(trimmed)) {
            return 'Context name can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'pathPattern',
        message: 'Path pattern for repositories (e.g., ~/personal/**, /work/**):',
        validate: input => {
          const trimmed = input.trim();
          if (trimmed === '') return 'Path pattern is required';
          if (!validatePathPattern(trimmed)) {
            return 'Path pattern contains invalid characters';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'userName',
        message: 'Git user name for this context:',
        validate: input => input.trim() !== '' ? true : 'User name is required'
      },
      {
        type: 'input',
        name: 'userEmail',
        message: 'Git user email for this context:',
        validate: input => {
          const trimmed = input.trim();
          if (trimmed === '') return 'User email is required';
          if (!validateEmail(trimmed)) {
            return 'Please enter a valid email address';
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'addSigningKey',
        message: 'Would you like to configure a GPG signing key for this context?',
        default: false
      }
    ]);
    
    let signingKey = null;
    let autoSign = false;
    
    if (answers.addSigningKey) {
      const signingAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'signingKey',
          message: 'GPG signing key ID:',
          validate: input => {
            const trimmed = input.trim();
            if (trimmed === '') return 'Signing key is required';
            if (!/^[A-F0-9]+$/i.test(trimmed)) {
              return 'GPG key should be a hexadecimal value';
            }
            return true;
          }
        },
        {
          type: 'confirm',
          name: 'autoSign',
          message: 'Automatically sign all commits for this context?',
          default: true
        }
      ]);
      
      signingKey = signingAnswers.signingKey.trim();
      autoSign = signingAnswers.autoSign;
    }
    
    return new Context(
      answers.name.trim(),
      answers.pathPattern.trim(),
      answers.userName.trim(),
      answers.userEmail.trim(),
      signingKey,
      autoSign
    );
  }
  
  /**
   * Get multiple contexts from user
   * @returns {Promise<Array>} Array of Context objects
   */
  async getContextsFromUser() {
    this.displaySetupInfo();
    
    const contexts = [];
    let addAnother = true;
    
    while (addAnother) {
      const context = await this.getContextFromUser();
      contexts.push(context);
      
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addAnother',
          message: 'Would you like to add another context?',
          default: false
        }
      ]);
      
      addAnother = answer.addAnother;
    }
    
    return contexts;
  }
  
  /**
   * Prompt user to select a context to remove
   * @param {Array} contexts Available contexts
   * @returns {Promise<string>} Selected context name
   */
  async selectContextToRemove(contexts) {
    if (!contexts || contexts.length === 0) {
      return null;
    }
    
    const { contextName } = await inquirer.prompt([
      {
        type: 'list',
        name: 'contextName',
        message: 'Select a context to remove:',
        choices: contexts.map(c => c.name)
      }
    ]);
    
    return contextName;
  }
}